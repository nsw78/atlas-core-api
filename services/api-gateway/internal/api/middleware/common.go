package middleware

import (
	"strings"
	"time"

	"atlas-core-api/services/api-gateway/internal/infrastructure/config"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// RequestID middleware adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}

// SecureCORS returns a restrictive CORS configuration based on config
func SecureCORS(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORS.AllowedOrigins,
		AllowMethods:     cfg.CORS.AllowedMethods,
		AllowHeaders:     cfg.CORS.AllowedHeaders,
		ExposeHeaders:    cfg.CORS.ExposedHeaders,
		AllowCredentials: cfg.CORS.AllowCredentials,
		MaxAge:           time.Duration(cfg.CORS.MaxAge) * time.Second,
	}

	logger.Info("CORS middleware configured",
		zap.Strings("origins", cfg.CORS.AllowedOrigins),
		zap.Strings("methods", cfg.CORS.AllowedMethods),
	)

	return cors.New(corsConfig)
}

// SecurityHeaders adds security headers to all HTTP responses
func SecurityHeaders(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Enable XSS protection in older browsers
		if cfg.Security.XSSProtection {
			c.Header("X-XSS-Protection", "1; mode=block")
		}

		// HSTS (HTTP Strict Transport Security)
		if cfg.Security.HTTPS {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubdomains; preload")
		}

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy
		c.Header("Content-Security-Policy", cfg.Security.ContentSecurity)

		// Feature Policy / Permissions Policy
		c.Header("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()")

		// Remove Server header
		c.Header("Server", "")

		c.Next()
	}
}

// Recovery middleware with logging
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				logger.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.String("ip", c.ClientIP()),
				)

				c.JSON(500, gin.H{
					"code":     500,
					"message":  "Internal server error",
					"trace_id": c.GetString("request_id"),
				})
				c.Abort()
			}
		}()
		c.Next()
	}
}

// NormalizeJSON normalizes JSON requests and responses with proper encoding
func NormalizeJSON() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Set JSON as default content type for responses
		c.Header("Content-Type", "application/json; charset=utf-8")
		c.Next()
	}
}

// VersionHeader adds API version to response headers
func VersionHeader(version string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("API-Version", version)
		c.Header("X-API-Version", version)
		c.Next()
	}
}

// TraceContext propagates trace ID through the request
func TraceContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		traceID := c.GetHeader("X-Trace-ID")
		if traceID == "" {
			traceID = c.GetString("request_id")
		}
		c.Set("trace_id", traceID)
		c.Header("X-Trace-ID", traceID)
		c.Next()
	}
}

// AllowOnly allows only specific HTTP methods
func AllowOnly(methods ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		allowed := false
		for _, method := range methods {
			if strings.ToUpper(method) == c.Request.Method {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(405, gin.H{
				"code":    405,
				"message": "Method not allowed",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Hostname middleware adds hostname information
func Hostname() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Hostname", c.Request.Host)
		c.Next()
	}
}
