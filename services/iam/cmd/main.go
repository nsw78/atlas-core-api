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

const version = "2.0.0"

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg := config.Load()

	// Validate production configuration
	if cfg.Environment == "production" && cfg.JWTSecret == "change-me-in-production" {
		logger.Fatal("JWT_SECRET must be changed in production")
	}

	// Initialize database with connection pooling
	db, err := repository.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize repositories (both receive db connection)
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)

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

	// Initialize router with enterprise middleware
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger(logger))

	// Health check (unauthenticated)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "iam",
			"version": version,
		})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Public authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// Authenticated routes
		authenticated := api.Group("")
		authenticated.Use(middleware.Authenticate(cfg.JWTSecret))
		{
			// Logout requires auth
			authenticated.POST("/auth/logout", authHandler.Logout)

			// User self-management
			authenticated.GET("/users/me", userHandler.GetCurrentUser)
			authenticated.GET("/users/:id", userHandler.GetUser)
			authenticated.PUT("/users/:id", userHandler.UpdateUser)

			// Admin-only: user management
			admin := authenticated.Group("")
			admin.Use(middleware.RequireRole("admin"))
			{
				admin.GET("/users", userHandler.ListUsers)
				admin.DELETE("/users/:id", userHandler.DeleteUser)

				// Role management
				admin.GET("/roles", userHandler.ListRoles)
				admin.POST("/roles", userHandler.CreateRole)
				admin.POST("/users/:id/roles/:roleId", userHandler.AssignRole)
				admin.DELETE("/users/:id/roles/:roleId", userHandler.RemoveRole)
			}
		}
	}

	// Create HTTP server with enterprise timeouts
	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1MB
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting IAM Service",
			zap.String("version", version),
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

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited gracefully")
}
