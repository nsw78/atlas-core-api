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
	"atlas-core-api/services/graph-intelligence/internal/api/handlers"
	"atlas-core-api/services/graph-intelligence/internal/api/middleware"
	service "atlas-core-api/services/graph-intelligence/internal/application"
	"atlas-core-api/services/graph-intelligence/internal/infrastructure/config"
	"atlas-core-api/services/graph-intelligence/internal/infrastructure/graphdb"
)

func main() {
	cfg := config.Load()

	// Initialize Neo4j client
	neo4jClient := graphdb.NewNeo4jClient(cfg.Neo4jURI, cfg.Neo4jUser, cfg.Neo4jPassword)

	// Initialize graph service
	graphService := service.NewGraphService(neo4jClient)

	// Initialize handlers
	graphHandler := handlers.NewGraphHandler(graphService)

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
		// Entity resolution
		api.POST("/graph/entities/resolve", graphHandler.ResolveEntities)
		api.GET("/graph/entities/:id/relationships", graphHandler.GetRelationships)
		api.GET("/graph/entities/:id/neighbors", graphHandler.GetNeighbors)

		// Risk propagation
		api.GET("/graph/risk/propagate", graphHandler.PropagateRisk)
		api.POST("/graph/risk/propagate", graphHandler.PropagateRiskFromEntity)

		// Graph algorithms
		api.GET("/graph/communities", graphHandler.GetCommunities)
		api.GET("/graph/centrality", graphHandler.GetCentrality)
		api.GET("/graph/path", graphHandler.GetShortestPath)

		// Graph statistics
		api.GET("/graph/stats", graphHandler.GetStats)
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

	log.Printf("Graph Intelligence Service started on port %s", cfg.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Close Neo4j connection
	neo4jClient.Close()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
