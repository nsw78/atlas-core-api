package config

import (
	"os"
	"strconv"
)

type Config struct {
	Environment     string
	Port            int
	IAMServiceURL   string
	RedisURL        string
	JWTSecret       string
	LogLevel        string
	EnableTracing   bool
	EnableMetrics   bool
}

func Load() *Config {
	port, _ := strconv.Atoi(getEnv("PORT", "8080"))

	return &Config{
		Environment:     getEnv("ENVIRONMENT", "development"),
		Port:            port,
		IAMServiceURL:   getEnv("IAM_SERVICE_URL", "http://iam-service:8081"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:       getEnv("JWT_SECRET", "change-me-in-production"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		EnableTracing:   getEnvBool("ENABLE_TRACING", true),
		EnableMetrics:   getEnvBool("ENABLE_METRICS", true),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}
