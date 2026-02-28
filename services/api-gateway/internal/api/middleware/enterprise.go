package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"atlas-core-api/services/api-gateway/internal/domain/types"
	"atlas-core-api/services/api-gateway/internal/infrastructure/cache"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const (
	idempotencyKeyHeader  = "Idempotency-Key"
	idempotencyPrefix     = "idempotency:"
	idempotencyTTL        = 24 * time.Hour
	apiKeyHeader          = "X-API-Key"
	requestSignatureHeader = "X-Request-Signature"
	requestTimestampHeader = "X-Request-Timestamp"
	maxRequestAge         = 5 * time.Minute
	maxBodySize           = 10 << 20 // 10MB
)

// IdempotencyKey ensures POST/PUT/PATCH requests with the same key return cached responses
func IdempotencyKey(c cache.Cache, logger *zap.Logger) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// Only apply to mutating methods
		if ctx.Request.Method != http.MethodPost &&
			ctx.Request.Method != http.MethodPut &&
			ctx.Request.Method != http.MethodPatch {
			ctx.Next()
			return
		}

		key := ctx.GetHeader(idempotencyKeyHeader)
		if key == "" {
			ctx.Next()
			return
		}

		cacheKey := idempotencyPrefix + key

		// Check if we already processed this request
		var cached idempotencyResponse
		err := c.Get(ctx.Request.Context(), cacheKey, &cached)
		if err == nil {
			// Return cached response
			logger.Debug("Returning idempotent response",
				zap.String("idempotency_key", key),
			)
			ctx.Header("X-Idempotent-Replayed", "true")
			ctx.Data(cached.StatusCode, cached.ContentType, cached.Body)
			ctx.Abort()
			return
		}

		// Try to acquire the lock for this key
		acquired, _ := c.SetNX(ctx.Request.Context(), cacheKey+":lock", true, 30*time.Second)
		if !acquired {
			apiErr := types.NewAPIError(types.ErrConflict, "Request with this idempotency key is being processed")
			ctx.AbortWithStatusJSON(http.StatusConflict, types.NewErrorResponse(apiErr, ctx.Request.URL.Path))
			return
		}

		// Capture response
		writer := &idempotencyWriter{ResponseWriter: ctx.Writer}
		ctx.Writer = writer

		ctx.Next()

		// Cache the response
		response := idempotencyResponse{
			StatusCode:  writer.statusCode,
			ContentType: writer.Header().Get("Content-Type"),
			Body:        writer.body,
		}
		c.Set(ctx.Request.Context(), cacheKey, response, idempotencyTTL)
		c.Delete(ctx.Request.Context(), cacheKey+":lock")
	}
}

type idempotencyResponse struct {
	StatusCode  int    `json:"status_code"`
	ContentType string `json:"content_type"`
	Body        []byte `json:"body"`
}

type idempotencyWriter struct {
	gin.ResponseWriter
	body       []byte
	statusCode int
}

func (w *idempotencyWriter) Write(data []byte) (int, error) {
	w.body = append(w.body, data...)
	return w.ResponseWriter.Write(data)
}

func (w *idempotencyWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}

// BodySizeLimit limits the maximum request body size
func BodySizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.ContentLength > maxBytes {
			apiErr := types.NewAPIError(types.ErrBadRequest,
				fmt.Sprintf("Request body too large. Maximum size is %d bytes", maxBytes))
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge,
				types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// APIKeyAuth validates API keys for service-to-service communication
func APIKeyAuth(cfg *config.Config, logger *zap.Logger, c cache.Cache) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		apiKey := ctx.GetHeader(apiKeyHeader)
		if apiKey == "" {
			// Fall through to JWT auth
			ctx.Next()
			return
		}

		// Validate API key against cache/database
		var keyData apiKeyEntry
		cacheKey := "apikey:" + hashAPIKey(apiKey)
		err := c.Get(ctx.Request.Context(), cacheKey, &keyData)
		if err != nil {
			logger.Warn("Invalid API key", zap.String("ip", ctx.ClientIP()))
			apiErr := types.NewAPIError(types.ErrUnauthorized, "Invalid API key")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized,
				types.NewErrorResponse(apiErr, ctx.Request.URL.Path))
			return
		}

		if !keyData.Active {
			apiErr := types.NewAPIError(types.ErrUnauthorized, "API key is deactivated")
			ctx.AbortWithStatusJSON(http.StatusUnauthorized,
				types.NewErrorResponse(apiErr, ctx.Request.URL.Path))
			return
		}

		// Set API key context
		ctx.Set("api_key_id", keyData.ID)
		ctx.Set("api_key_name", keyData.Name)
		ctx.Set("api_key_scopes", keyData.Scopes)
		ctx.Set("auth_method", "api_key")

		ctx.Next()
	}
}

type apiKeyEntry struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Active bool     `json:"active"`
	Scopes []string `json:"scopes"`
}

func hashAPIKey(key string) string {
	h := sha256.New()
	h.Write([]byte(key))
	return hex.EncodeToString(h.Sum(nil))
}

// RequestSigning validates HMAC-SHA256 request signatures for webhook/partner integrations
func RequestSigning(signingSecret string, logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		signature := c.GetHeader(requestSignatureHeader)
		if signature == "" {
			// Not a signed request - skip
			c.Next()
			return
		}

		timestamp := c.GetHeader(requestTimestampHeader)
		if timestamp == "" {
			apiErr := types.NewAPIError(types.ErrBadRequest, "Missing request timestamp")
			c.AbortWithStatusJSON(http.StatusBadRequest,
				types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Validate timestamp to prevent replay attacks
		ts, err := time.Parse(time.RFC3339, timestamp)
		if err != nil {
			apiErr := types.NewAPIError(types.ErrBadRequest, "Invalid timestamp format")
			c.AbortWithStatusJSON(http.StatusBadRequest,
				types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		if time.Since(ts) > maxRequestAge {
			apiErr := types.NewAPIError(types.ErrBadRequest, "Request timestamp too old")
			c.AbortWithStatusJSON(http.StatusBadRequest,
				types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		// Read and restore body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			apiErr := types.NewAPIError(types.ErrBadRequest, "Failed to read request body")
			c.AbortWithStatusJSON(http.StatusBadRequest,
				types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}
		c.Request.Body = io.NopCloser(strings.NewReader(string(body)))

		// Compute expected signature
		signingPayload := fmt.Sprintf("%s.%s.%s", timestamp, c.Request.URL.Path, string(body))
		mac := hmac.New(sha256.New, []byte(signingSecret))
		mac.Write([]byte(signingPayload))
		expectedSignature := hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
			logger.Warn("Invalid request signature",
				zap.String("ip", c.ClientIP()),
				zap.String("path", c.Request.URL.Path),
			)
			apiErr := types.NewAPIError(types.ErrUnauthorized, "Invalid request signature")
			c.AbortWithStatusJSON(http.StatusUnauthorized,
				types.NewErrorResponse(apiErr, c.Request.URL.Path))
			return
		}

		c.Set("request_signed", true)
		c.Next()
	}
}

// RequestTimeout sets a per-request timeout
func RequestTimeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// The timeout is enforced by the http.Server ReadTimeout/WriteTimeout
		// This header informs the client of the expected timeout
		c.Header("X-Request-Timeout", timeout.String())
		c.Next()
	}
}

// DeprecationWarning marks endpoints as deprecated
func DeprecationWarning(message string, sunsetDate time.Time) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Deprecation", "true")
		c.Header("Sunset", sunsetDate.Format(http.TimeFormat))
		c.Header("Link", fmt.Sprintf(`</api/v2%s>; rel="successor-version"`, c.Request.URL.Path))
		if message != "" {
			c.Header("X-Deprecation-Notice", message)
		}
		c.Next()
	}
}

// SensitiveEndpoint adds extra security for sensitive operations
func SensitiveEndpoint(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log access to sensitive endpoints
		logger.Info("Sensitive endpoint accessed",
			zap.String("path", c.Request.URL.Path),
			zap.String("method", c.Request.Method),
			zap.String("ip", c.ClientIP()),
			zap.String("user_id", c.GetString("user_id")),
			zap.String("request_id", c.GetString("request_id")),
		)

		// Prevent caching of sensitive responses
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")

		c.Next()
	}
}
