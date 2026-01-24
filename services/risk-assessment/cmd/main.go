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

	"atlas-core-api/services/risk-assessment/internal/api/handlers"
	"atlas-core-api/services/risk-assessment/internal/api/middleware"
	service "atlas-core-api/services/risk-assessment/internal/application"
	"atlas-core-api/services/risk-assessment/internal/infrastructure"
	"atlas-core-api/services/risk-assessment/internal/infrastructure/config"
	"atlas-core-api/services/risk-assessment/internal/infrastructure/repository"
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

	// Initialize repository
	riskRepo := repository.NewRiskRepository()

	// Initialize external data provider
	dataProviderConfig := &infrastructure.DataProviderConfig{
		FinancialAPIKey:     cfg.DataProvider.FinancialAPIKey,
		FinancialBaseURL:    cfg.DataProvider.FinancialBaseURL,
		GeopoliticalAPIKey:  cfg.DataProvider.GeopoliticalAPIKey,
		GeopoliticalBaseURL: cfg.DataProvider.GeopoliticalBaseURL,
		ComplianceAPIKey:    cfg.DataProvider.ComplianceAPIKey,
		ComplianceBaseURL:   cfg.DataProvider.ComplianceBaseURL,
		NewsAPIKey:          cfg.DataProvider.NewsAPIKey,
		NewsBaseURL:         cfg.DataProvider.NewsBaseURL,
		Timeout:             cfg.DataProvider.Timeout,
	}
	dataProvider := infrastructure.NewRealDataProvider(dataProviderConfig)

	// Initialize services
	riskService := service.NewRiskAssessmentService(riskRepo, dataProvider)

	// Initialize handlers
	riskHandler := handlers.NewRiskHandler(riskService)

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize router
	r := gin.New() // Use New() with no default middlewares

	// Health check
	r.GET("/health", handlers.HealthCheck)

	// Public API routes (no auth for testing)
	r.POST("/api/v1/risks/assess", riskHandler.AssessRisk)
	r.GET("/api/v1/risks/:id", riskHandler.GetRiskAssessment)
	r.GET("/api/v1/risks/trends", riskHandler.GetRiskTrends)
	r.GET("/api/v1/risks/entities/:entity_id", riskHandler.GetAssessmentsByEntity)

	// API routes for alerts (keeping auth for now)
	alerts := r.Group("/api/v1/risk/alerts")
	alerts.Use(middleware.Authenticate(cfg.JWTSecret))
	{
		alerts.POST("", riskHandler.ConfigureAlert)
		alerts.GET("", riskHandler.ListAlerts)
		alerts.DELETE("/:id", riskHandler.DeleteAlert)
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
