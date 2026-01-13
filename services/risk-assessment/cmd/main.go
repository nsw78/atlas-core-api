package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"atlas-core-api/services/risk-assessment/internal/config"
	"atlas-core-api/services/risk-assessment/internal/handlers"
	"atlas-core-api/services/risk-assessment/internal/middleware"
	"atlas-core-api/services/risk-assessment/internal/service"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Initialize services
	riskService := service.NewRiskAssessmentService()

	// Initialize handlers
	riskHandler := handlers.NewRiskHandler(riskService)

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize router
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger(logger))
	r.Use(middleware.RequestID())

	// Health check
	r.GET("/health", handlers.HealthCheck)

	// API routes
	api := r.Group("/api/v1")
	api.Use(middleware.Authenticate(cfg.JWTSecret))
	{
		risks := api.Group("/risks")
		{
			risks.POST("/assess", riskHandler.AssessRisk)
			risks.GET("/:id", riskHandler.GetRiskAssessment)
			risks.GET("/trends", riskHandler.GetRiskTrends)
			risks.POST("/alerts", riskHandler.ConfigureAlert)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting Risk Assessment Service",
			zap.Int("port", cfg.Port),
			zap.String("environment", cfg.Environment),
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
