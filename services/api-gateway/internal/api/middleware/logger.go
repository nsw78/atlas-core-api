package middleware

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Logger is a middleware for structured logging with detailed metrics
func Logger(logger *zap.Logger, metricsRecorder func(method, path string, status int, duration time.Duration, size int64)) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		method := c.Request.Method
		ip := c.ClientIP()
		userAgent := c.Request.UserAgent()

		// Capture request body size
		var requestSize int64
		if c.Request.Body != nil {
			requestSize = c.Request.ContentLength
		}

		// After response
		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()
		responseSize := int64(c.Writer.Size())

		// Determine log level based on status code
		logLevel := zap.DebugLevel
		if status >= 500 {
			logLevel = zap.ErrorLevel
		} else if status >= 400 {
			logLevel = zap.WarnLevel
		}

		// Log the request
		logger.Log(
			logLevel,
			"HTTP Request",
			zap.String("method", method),
			zap.String("path", path),
			zap.String("query", query),
			zap.String("ip", ip),
			zap.Int("status", status),
			zap.Duration("latency", duration),
			zap.String("user_agent", userAgent),
			zap.Int64("request_size", requestSize),
			zap.Int64("response_size", responseSize),
			zap.String("request_id", getRequestID(c)),
		)

		// Record metrics
		if metricsRecorder != nil {
			metricsRecorder(method, path, status, duration, responseSize)
		}
	}
}

// AccessLog logs HTTP access in a standard format
func AccessLog(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Request details
		method := c.Request.Method
		path := c.Request.URL.Path
		ip := c.ClientIP()

		// Response details
		c.Next()

		duration := time.Since(start)
		statusCode := c.Writer.Status()
		responseSize := c.Writer.Size()

		// Format: IP - [TIME] "METHOD PATH HTTP/1.1" STATUS_CODE RESPONSE_SIZE "USER_AGENT"
		logger.Info(
			"Access",
			zap.String("ip", ip),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", statusCode),
			zap.Int("size", responseSize),
			zap.Duration("duration", duration),
			zap.String("user_agent", c.Request.UserAgent()),
		)
	}
}

// ErrorLogger logs errors that occur during request handling
func ErrorLogger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Check for errors
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				logger.Error(
					"Request Error",
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
					zap.String("ip", c.ClientIP()),
					zap.Int("status", c.Writer.Status()),
					zap.Error(err.Err),
					zap.String("type", fmt.Sprintf("%d", err.Type)),
				)
			}
		}
	}
}

// getRequestID retrieves the request ID from context
func getRequestID(c *gin.Context) string {
	id, exists := c.Get("request_id")
	if !exists {
		return ""
	}
	idStr, ok := id.(string)
	if !ok {
		return ""
	}
	return idStr
}
