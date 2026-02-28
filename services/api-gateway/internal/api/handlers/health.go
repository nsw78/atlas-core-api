package handlers

import (
	"net/http"
	"time"

	"atlas-core-api/services/api-gateway/internal/infrastructure/cache"
	"atlas-core-api/services/api-gateway/internal/presentation/dto"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// HealthCheckHandler manages health check endpoints
type HealthCheckHandler struct {
	logger    *zap.Logger
	cache     cache.Cache
	startTime time.Time
	services  map[string]func() error
}

// NewHealthCheckHandler creates a new health check handler
func NewHealthCheckHandler(logger *zap.Logger, c cache.Cache) *HealthCheckHandler {
	return &HealthCheckHandler{
		logger:    logger,
		cache:     c,
		startTime: time.Now(),
		services:  make(map[string]func() error),
	}
}

// RegisterService registers a service health check function
func (h *HealthCheckHandler) RegisterService(name string, checkFunc func() error) {
	h.services[name] = checkFunc
}

// HealthCheck returns the health status of the API gateway
func (h *HealthCheckHandler) HealthCheck(c *gin.Context) {
	response := dto.HealthCheckResponse{
		Status:    "healthy",
		Version:   "1.0.0",
		Timestamp: time.Now(),
		Services:  make(map[string]dto.ServiceHealth),
		Uptime:    int64(time.Since(h.startTime).Seconds()),
	}

	// Check cache health
	if h.cache != nil {
		now := time.Now()
		err := h.cache.HealthCheck(c.Request.Context())
		duration := time.Since(now)

		if err != nil {
			response.Status = "degraded"
			response.Services["cache"] = dto.ServiceHealth{
				Status:    "unhealthy",
				Latency:   int(duration.Milliseconds()),
				Message:   err.Error(),
				LastCheck: time.Now(),
			}
			h.logger.Warn("Cache health check failed", zap.Error(err))
		} else {
			response.Services["cache"] = dto.ServiceHealth{
				Status:    "healthy",
				Latency:   int(duration.Milliseconds()),
				LastCheck: time.Now(),
			}
		}
	}

	// Check registered services
	for name, checkFunc := range h.services {
		now := time.Now()
		err := checkFunc()
		duration := time.Since(now)

		if err != nil {
			response.Status = "degraded"
			response.Services[name] = dto.ServiceHealth{
				Status:    "unhealthy",
				Latency:   int(duration.Milliseconds()),
				Message:   err.Error(),
				LastCheck: time.Now(),
			}
			h.logger.Warn("Service health check failed", zap.String("service", name), zap.Error(err))
		} else {
			response.Services[name] = dto.ServiceHealth{
				Status:    "healthy",
				Latency:   int(duration.Milliseconds()),
				LastCheck: time.Now(),
			}
		}
	}

	statusCode := http.StatusOK
	if response.Status == "degraded" {
		statusCode = http.StatusServiceUnavailable
	} else if response.Status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}

// LivenessProbe returns whether the API is alive
func (h *HealthCheckHandler) LivenessProbe(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now(),
	})
}

// ReadinessProbe returns whether the API is ready to accept requests
func (h *HealthCheckHandler) ReadinessProbe(c *gin.Context) {
	// Check critical dependencies
	ready := true

	if h.cache != nil {
		if err := h.cache.HealthCheck(c.Request.Context()); err != nil {
			ready = false
			h.logger.Warn("Cache not ready", zap.Error(err))
		}
	}

	if !ready {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "not_ready",
			"message": "Service is not ready to accept requests",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "ready",
		"timestamp": time.Now(),
	})
}

// Metrics returns health metrics
func (h *HealthCheckHandler) Metrics(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"uptime_seconds": int64(time.Since(h.startTime).Seconds()),
		"timestamp":      time.Now(),
	})
}
