package config

import (
	"os"
)

type Config struct {
	Port              string
	KafkaBrokers      []string
	KafkaRawTopic     string
	KafkaNormalizedTopic string
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
}

func Load() *Config {
	return &Config{
		Port:                getEnv("PORT", "8085"),
		KafkaBrokers:        []string{getEnv("KAFKA_BROKERS", "localhost:9092")},
		KafkaRawTopic:       getEnv("KAFKA_RAW_TOPIC", "raw-data"),
		KafkaNormalizedTopic: getEnv("KAFKA_NORMALIZED_TOPIC", "normalized-data"),
		DBHost:              getEnv("DB_HOST", "localhost"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBUser:              getEnv("DB_USER", "atlas"),
		DBPassword:          getEnv("DB_PASSWORD", "atlas"),
		DBName:              getEnv("DB_NAME", "atlas"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
