package config

import (
	"os"
)

type Config struct {
	Port       string
	Neo4jURI   string
	Neo4jUser  string
	Neo4jPassword string
}

func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8089"),
		Neo4jURI:     getEnv("NEO4J_URI", "bolt://localhost:7687"),
		Neo4jUser:    getEnv("NEO4J_USER", "neo4j"),
		Neo4jPassword: getEnv("NEO4J_PASSWORD", "neo4j"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
