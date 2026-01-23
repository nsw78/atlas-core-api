package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

// RateLimiter creates a rate limiter middleware
// Default: 100 requests per minute per IP
func RateLimiter() gin.HandlerFunc {
	// Define rate limit (100 requests per minute)
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  100,
	}

	// Create in-memory store with 1-hour cleanup
	store := memory.NewStore()

	// Create limiter instance
	instance := limiter.New(store, rate)

	// Return Gin middleware
	return mgin.NewMiddleware(instance)
}

// StrictRateLimiter creates a stricter rate limiter for sensitive endpoints
// 20 requests per minute per IP
func StrictRateLimiter() gin.HandlerFunc {
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  20,
	}

	store := memory.NewStore()
	instance := limiter.New(store, rate)

	return mgin.NewMiddleware(instance)
}
