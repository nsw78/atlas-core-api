package config

import (
	"os"
	"strconv"
)

type Config struct {
	Environment string
	Port        int
	DatabaseURL string
	JWTSecret   string
	LogLevel    string
}

func Load() *Config {
	port, _ := strconv.Atoi(getEnv("PORT", "8081"))

	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:        port,
		DatabaseURL: getEnv("DATABASE_URL", "postgres://atlas:atlas_dev@localhost:5432/atlas?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
