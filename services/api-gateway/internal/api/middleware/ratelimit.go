package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
	"go.uber.org/zap"

	"atlas-core-api/services/api-gateway/internal/infrastructure/config"
)

// RateLimiter creates a rate limiter middleware from config
func RateLimiter(cfg *config.Config, logger *zap.Logger) gin.HandlerFunc {
	rate := limiter.Rate{
		Period: 1 * time.Second,
		Limit:  int64(cfg.RateLimit.RequestsPerSecond),
	}

	store := memory.NewStore()
	instance := limiter.New(store, rate)

	logger.Info("Rate limiter configured",
		zap.Int("rps", cfg.RateLimit.RequestsPerSecond),
		zap.Int("burst", cfg.RateLimit.BurstSize),
	)

	return mgin.NewMiddleware(instance)
}

// StrictRateLimiter creates a stricter rate limiter for sensitive endpoints
func StrictRateLimiter() gin.HandlerFunc {
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  20,
	}

	store := memory.NewStore()
	instance := limiter.New(store, rate)

	return mgin.NewMiddleware(instance)
}
