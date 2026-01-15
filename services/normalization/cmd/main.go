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
	"atlas-core-api/services/normalization/internal/api/handlers"
	"atlas-core-api/services/normalization/internal/api/middleware"
	service "atlas-core-api/services/normalization/internal/application"
	"atlas-core-api/services/normalization/internal/infrastructure/config"
	"atlas-core-api/services/normalization/internal/infrastructure/messaging"
)

func main() {
	cfg := config.Load()

	// Initialize Kafka consumer and producer
	kafkaConsumer := messaging.NewKafkaConsumer(cfg.KafkaBrokers, cfg.KafkaRawTopic)
	kafkaProducer := messaging.NewKafkaProducer(cfg.KafkaBrokers)

	// Initialize normalization service
	normalizationService := service.NewNormalizationService(kafkaConsumer, kafkaProducer, cfg.KafkaNormalizedTopic)

	// Start Kafka consumer in background
	go func() {
		if err := normalizationService.StartConsuming(context.Background()); err != nil {
			log.Fatalf("Failed to start Kafka consumer: %v", err)
		}
	}()

	// Initialize handlers
	normalizationHandler := handlers.NewNormalizationHandler(normalizationService)

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
		// Normalization endpoints
		rules := api.Group("/normalization/rules")
		{
			rules.GET("", normalizationHandler.ListRules)
			rules.POST("", normalizationHandler.CreateRule)
			rules.GET("/:id", normalizationHandler.GetRule)
			rules.PUT("/:id", normalizationHandler.UpdateRule)
			rules.DELETE("/:id", normalizationHandler.DeleteRule)
		}

		api.GET("/normalization/quality/:data_id", normalizationHandler.GetQuality)
		api.GET("/normalization/stats", normalizationHandler.GetStats)
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

	log.Printf("Normalization Service started on port %s", cfg.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Stop Kafka consumer
	normalizationService.StopConsuming()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
