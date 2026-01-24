package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Environment string
	Port        int
	JWTSecret   string
	LogLevel    string

	// External Data Provider Configuration
	DataProvider DataProviderConfig
}

type DataProviderConfig struct {
	FinancialAPIKey     string
	FinancialBaseURL    string
	GeopoliticalAPIKey  string
	GeopoliticalBaseURL string
	ComplianceAPIKey    string
	ComplianceBaseURL   string
	NewsAPIKey          string
	NewsBaseURL         string
	Timeout             time.Duration
}

func Load() *Config {
	port, _ := strconv.Atoi(getEnv("PORT", "8082"))
	timeout, _ := time.ParseDuration(getEnv("API_TIMEOUT", "30s"))

	return &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		Port:        port,
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		DataProvider: DataProviderConfig{
			FinancialAPIKey:     getEnv("FINANCIAL_API_KEY", ""),
			FinancialBaseURL:    getEnv("FINANCIAL_API_URL", "https://api.financialdata.com"),
			GeopoliticalAPIKey:  getEnv("GEOPOLITICAL_API_KEY", ""),
			GeopoliticalBaseURL: getEnv("GEOPOLITICAL_API_URL", "https://api.geopoliticaldata.com"),
			ComplianceAPIKey:    getEnv("COMPLIANCE_API_KEY", ""),
			ComplianceBaseURL:   getEnv("COMPLIANCE_API_URL", "https://api.compliancedata.com"),
			NewsAPIKey:          getEnv("NEWS_API_KEY", ""),
			NewsBaseURL:         getEnv("NEWS_API_URL", "https://api.newsdata.com"),
			Timeout:             timeout,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
