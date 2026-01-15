package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"atlas-core-api/services/audit-logging/internal/api/handlers"
	"atlas-core-api/services/audit-logging/internal/api/middleware"
	service "atlas-core-api/services/audit-logging/internal/application"
	"atlas-core-api/services/audit-logging/internal/infrastructure/config"
	"atlas-core-api/services/audit-logging/internal/infrastructure/repository"
)

func main() {
	cfg := config.Load()

	// Initialize repository
	repo := repository.NewAuditRepository()

	// Initialize service
	auditService := service.NewAuditService(repo)

	// Initialize handlers
	auditHandler := handlers.NewAuditHandler(auditService)

	// Setup router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.RequestID())
	router.Use(middleware.CORS())

	// Health check
	router.GET("/health", handlers.HealthCheck)

	// API routes
	api := router.Group("/api/v1")
	{
		// Audit endpoints
		audit := api.Group("/audit")
		{
			audit.GET("/logs", auditHandler.GetLogs)
			audit.GET("/logs/:id", auditHandler.GetLog)
			audit.POST("/events", auditHandler.CreateEvent)
			audit.GET("/compliance/report", auditHandler.GetComplianceReport)
		}
	}

	// Start server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Audit Logging Service started on port %s", cfg.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
