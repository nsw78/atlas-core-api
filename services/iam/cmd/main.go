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

	"atlas-core-api/services/iam/internal/api/handlers"
	"atlas-core-api/services/iam/internal/api/middleware"
	service "atlas-core-api/services/iam/internal/application"
	"atlas-core-api/services/iam/internal/infrastructure/config"
	"atlas-core-api/services/iam/internal/infrastructure/repository"
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

	// Initialize database
	db, err := repository.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository()

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret, logger)
	userService := service.NewUserService(userRepo, roleRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)

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
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// User management routes (protected)
		users := api.Group("/users")
		users.Use(middleware.Authenticate(cfg.JWTSecret))
		{
			users.GET("/me", userHandler.GetCurrentUser)
			users.GET("/:id", userHandler.GetUser)
			users.PUT("/:id", userHandler.UpdateUser)
		}

		// Role management routes (admin only)
		roles := api.Group("/roles")
		roles.Use(middleware.Authenticate(cfg.JWTSecret))
		roles.Use(middleware.RequireRole("admin"))
		{
			roles.GET("", userHandler.ListRoles)
			roles.POST("", userHandler.CreateRole)
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
		logger.Info("Starting IAM Service",
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
