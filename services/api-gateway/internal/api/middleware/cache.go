package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"atlas-core-api/services/api-gateway/internal/infrastructure/cache"
)

// CacheMiddleware creates a caching middleware using Redis
func CacheMiddleware(redisCache *cache.RedisCache, ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only cache GET requests
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		// Generate cache key from URL and query params
		cacheKey := generateCacheKey(c.Request.URL.Path, c.Request.URL.RawQuery)

		// Try to get from cache
		var cachedResponse CachedResponse
		err := redisCache.Get(cacheKey, &cachedResponse)
		if err == nil && cachedResponse.Body != nil {
			// Cache hit - return cached response
			c.Header("X-Cache", "HIT")
			for key, value := range cachedResponse.Headers {
				c.Header(key, value)
			}
			c.Data(cachedResponse.StatusCode, cachedResponse.ContentType, cachedResponse.Body)
			c.Abort()
			return
		}

		// Cache miss - continue with request
		c.Header("X-Cache", "MISS")

		// Capture response
		writer := &responseWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = writer

		c.Next()

		// Store response in cache if successful
		if writer.Status() >= 200 && writer.Status() < 300 {
			response := CachedResponse{
				StatusCode:  writer.Status(),
				ContentType: writer.Header().Get("Content-Type"),
				Headers:     make(map[string]string),
				Body:        writer.body.Bytes(),
			}

			// Copy important headers
			for _, header := range []string{"Content-Type", "Content-Encoding"} {
				if val := writer.Header().Get(header); val != "" {
					response.Headers[header] = val
				}
			}

			redisCache.Set(cacheKey, response, ttl)
		}
	}
}

type CachedResponse struct {
	StatusCode  int               `json:"status_code"`
	ContentType string            `json:"content_type"`
	Headers     map[string]string `json:"headers"`
	Body        []byte            `json:"body"`
}

type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w *responseWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseWriter) WriteString(s string) (int, error) {
	w.body.WriteString(s)
	return w.ResponseWriter.WriteString(s)
}

func generateCacheKey(path, query string) string {
	combined := path + "?" + query
	hash := sha256.Sum256([]byte(combined))
	return "cache:api:" + hex.EncodeToString(hash[:])
}
