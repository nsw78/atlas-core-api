package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"atlas-core-api/services/api-gateway/internal/api/handlers"
	"atlas-core-api/services/api-gateway/internal/api/middleware"
	"atlas-core-api/services/api-gateway/internal/api/router"
	"atlas-core-api/services/api-gateway/internal/infrastructure/cache"
	"atlas-core-api/services/api-gateway/internal/infrastructure/config"
	"atlas-core-api/services/api-gateway/internal/infrastructure/observability/metrics"
	"atlas-core-api/services/api-gateway/internal/infrastructure/observability/tracing"
	"atlas-core-api/services/api-gateway/internal/infrastructure/resilience/circuitbreaker"
)

const (
	serviceName = "atlas-api-gateway"
	version     = "2.0.0"
)

func main() {
	logger := initLogger()
	defer logger.Sync()

	logger.Info("Starting API Gateway",
		zap.String("service", serviceName),
		zap.String("version", version),
	)

	cfg := config.Load()
	logger.Info("Configuration loaded",
		zap.String("environment", cfg.Environment),
		zap.Int("port", cfg.Server.Port),
		zap.Int("registered_services", len(cfg.Services.Registry)),
	)

	// Validate critical config in production
	if cfg.Auth.JWTSecret == "change-me-in-production" && cfg.Environment == "production" {
		logger.Fatal("JWT_SECRET must be changed in production")
	}

	metricsInstance := metrics.NewMetrics(logger)

	// Initialize cache
	var cacheInstance cache.Cache
	var err error
	if cfg.Cache.Type == "redis" {
		cacheInstance, err = cache.NewRedisCache(cfg.Cache.RedisURL, logger)
	} else {
		cacheInstance = cache.NewInMemoryCache(logger)
	}
	if err != nil {
		logger.Fatal("Failed to initialize cache", zap.Error(err))
	}
	defer cacheInstance.Close()

	// Initialize tracing
	var tracerProvider *tracing.TracerProvider
	if cfg.Tracing.Enabled {
		var err error
		tracerProvider, err = tracing.NewTracerProvider(serviceName, cfg.Tracing.JaegerEndpoint, logger)
		if err != nil {
			logger.Warn("Failed to initialize tracing, using no-op", zap.Error(err))
			tracerProvider = tracing.NewNoopTracerProvider(serviceName, logger)
		} else {
			defer tracerProvider.Shutdown(context.Background())
		}
	} else {
		tracerProvider = tracing.NewNoopTracerProvider(serviceName, logger)
	}

	// Register circuit breakers for ALL services in the registry
	cbPool := circuitbreaker.NewCircuitBreakerPool(logger)
	for svcName := range cfg.Services.Registry {
		cbPool.Register(
			svcName,
			circuitbreaker.NewGoCircuitBreaker(
				svcName,
				cfg.Services.IAMService.CircuitBreaker.MaxFailures,
				cfg.Services.IAMService.CircuitBreaker.Timeout,
				logger,
			),
		)
	}
	logger.Info("Circuit breakers registered", zap.Int("count", len(cfg.Services.Registry)))

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// =============================================
	// ENTERPRISE MIDDLEWARE PIPELINE
	// =============================================
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.RequestID())
	r.Use(middleware.TraceContext())
	r.Use(middleware.Logger(logger, func(method, path string, status int, duration time.Duration, size int64) {
		metricsInstance.RecordHTTPRequest(method, path, duration, status, size)
	}))
	r.Use(middleware.SecurityHeaders(cfg))
	r.Use(middleware.NormalizeJSON())
	r.Use(middleware.VersionHeader(version))

	if cfg.CORS.Enabled {
		r.Use(middleware.SecureCORS(cfg, logger))
	}
	if cfg.RateLimit.Enabled {
		r.Use(middleware.RateLimiter(cfg, logger))
	}

	r.Use(middleware.BodySizeLimit(10 << 20))
	r.Use(gzip.Gzip(gzip.DefaultCompression))

	// =============================================
	// HANDLERS
	// =============================================
	authHandler := handlers.NewAuthHandler(cfg, logger, cacheInstance)
	healthHandler := handlers.NewHealthCheckHandler(logger, cacheInstance)

	healthHandler.RegisterService("cache", func() error {
		return cacheInstance.HealthCheck(context.Background())
	})

	// =============================================
	// ROUTES
	// =============================================

	// Health (no auth)
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/healthz", healthHandler.LivenessProbe)
	r.GET("/readyz", healthHandler.ReadinessProbe)

	api := r.Group("/api/v1")

	// Public auth endpoints
	public := api.Group("")
	{
		public.POST("/auth/login", authHandler.Login)
		public.POST("/auth/refresh", authHandler.RefreshToken)
		public.GET("/auth/validate", authHandler.ValidateToken)
	}

	// Protected endpoints
	protected := api.Group("")
	protected.Use(middleware.Authenticate(cfg, logger))
	{
		protected.POST("/auth/logout", authHandler.Logout)
		protected.POST("/auth/change-password",
			middleware.SensitiveEndpoint(logger),
			authHandler.ChangePassword,
		)

		// Idempotency for mutating operations
		protected.Use(middleware.IdempotencyKey(cacheInstance, logger))

		// All downstream service proxy routes
		router.SetupRoutes(protected, cfg, logger)
	}

	// =============================================
	// SERVERS
	// =============================================
	var metricsServer *http.Server
	if cfg.Metrics.Enabled {
		metricsServer = &http.Server{
			Addr:    fmt.Sprintf(":%d", cfg.Metrics.Port),
			Handler: promhttp.Handler(),
		}
		go func() {
			logger.Info("Starting metrics server", zap.Int("port", cfg.Metrics.Port))
			if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				logger.Error("Metrics server error", zap.Error(err))
			}
		}()
	}

	srv := &http.Server{
		Addr:           fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:        r,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		IdleTimeout:    cfg.Server.IdleTimeout,
		MaxHeaderBytes: cfg.Server.MaxHeaderBytes,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("Starting server",
			zap.String("addr", srv.Addr),
			zap.String("environment", cfg.Environment),
		)
		serverErrors <- srv.ListenAndServe()
	}()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigChan:
		logger.Info("Received signal", zap.String("signal", sig.String()))
	case err := <-serverErrors:
		if err != http.ErrServerClosed {
			logger.Fatal("Server error", zap.Error(err))
		}
	}

	// Graceful shutdown
	if cfg.Server.GracefulShutdown {
		logger.Info("Starting graceful shutdown", zap.Duration("timeout", cfg.Server.ShutdownTimeout))

		ctx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
		defer cancel()

		var wg sync.WaitGroup

		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := srv.Shutdown(ctx); err != nil {
				logger.Error("Server shutdown error", zap.Error(err))
			}
		}()

		if metricsServer != nil {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := metricsServer.Shutdown(ctx); err != nil {
					logger.Error("Metrics server shutdown error", zap.Error(err))
				}
			}()
		}

		wg.Wait()
		logger.Info("Shutdown complete")
	} else {
		srv.Close()
		logger.Info("Server closed")
	}
}

func initLogger() *zap.Logger {
	var logger *zap.Logger
	var err error

	if os.Getenv("ENVIRONMENT") == "production" {
		logger, err = zap.NewProduction()
	} else {
		config := zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		logger, err = config.Build()
	}

	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}

	return logger
}
