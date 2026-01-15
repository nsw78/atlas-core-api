package config

import (
	"os"
)

type Config struct {
	Port     string
	DBHost   string
	DBPort   string
	DBUser   string
	DBPassword string
	DBName   string
}

func Load() *Config {
	return &Config{
		Port:       getEnv("PORT", "8086"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "atlas"),
		DBPassword: getEnv("DB_PASSWORD", "atlas"),
		DBName:     getEnv("DB_NAME", "atlas"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
