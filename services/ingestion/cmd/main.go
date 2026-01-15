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
	"atlas-core-api/services/ingestion/internal/api/handlers"
	"atlas-core-api/services/ingestion/internal/api/middleware"
	"atlas-core-api/services/ingestion/internal/application"
	"atlas-core-api/services/ingestion/internal/infrastructure/config"
	"atlas-core-api/services/ingestion/internal/infrastructure/repository"
)

func main() {
	cfg := config.Load()

	// Initialize repository
	repo := repository.NewSourceRepository()

	// Initialize Kafka producer (stub for now)
	kafkaProducer := service.NewKafkaProducer(cfg.KafkaBrokers)

	// Initialize services
	ingestionService := service.NewIngestionService(repo, kafkaProducer)

	// Initialize source processor
	sourceProcessor := service.NewSourceProcessor(ingestionService, cfg.NewsAPIKey)

	// Initialize handlers
	ingestionHandler := handlers.NewIngestionHandler(ingestionService, sourceProcessor)

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
		// Ingestion endpoints
		sources := api.Group("/ingestion/sources")
		{
			sources.GET("", ingestionHandler.ListSources)
			sources.POST("", ingestionHandler.RegisterSource)
			sources.GET("/:id", ingestionHandler.GetSource)
			sources.POST("/:id/data", ingestionHandler.IngestData)
			sources.POST("/:id/trigger", ingestionHandler.TriggerIngestion)
		}

		api.GET("/ingestion/status", ingestionHandler.GetStatus)
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

	log.Printf("Ingestion Service started on port %s", cfg.Port)

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
