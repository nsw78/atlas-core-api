package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("generates request ID when not provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/test", nil)

		RequestID()(c)

		requestID := c.GetString("request_id")
		assert.NotEmpty(t, requestID, "Request ID should be generated")
		assert.Equal(t, requestID, w.Header().Get("X-Request-ID"))
	})

	t.Run("uses provided request ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("X-Request-ID", "test-id-123")
		c.Request = req

		RequestID()(c)

		requestID := c.GetString("request_id")
		assert.Equal(t, "test-id-123", requestID)
		assert.Equal(t, "test-id-123", w.Header().Get("X-Request-ID"))
	})
}

func TestSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/test", nil)

	SecurityHeaders()(c)

	headers := w.Header()
	assert.Equal(t, "DENY", headers.Get("X-Frame-Options"))
	assert.Equal(t, "nosniff", headers.Get("X-Content-Type-Options"))
	assert.Equal(t, "1; mode=block", headers.Get("X-XSS-Protection"))
	assert.Contains(t, headers.Get("Strict-Transport-Security"), "max-age=31536000")
	assert.Equal(t, "strict-origin-when-cross-origin", headers.Get("Referrer-Policy"))
}

func TestSecureCORS(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("handles OPTIONS preflight request", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		r.Use(SecureCORS())
		r.OPTIONS("/test", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		req := httptest.NewRequest("OPTIONS", "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		c.Request = req

		r.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNoContent, w.Code)
	})

	t.Run("sets CORS headers for allowed origin", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, r := gin.CreateTestContext(w)

		r.Use(SecureCORS())
		r.GET("/test", func(c *gin.Context) {
			c.Status(http.StatusOK)
		})

		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("Origin", "http://localhost:3000")
		c.Request = req

		r.ServeHTTP(w, req)

		headers := w.Header()
		assert.Contains(t, headers.Get("Access-Control-Allow-Origin"), "localhost:3000")
	})
}
