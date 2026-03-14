package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config represents the complete application configuration
type Config struct {
	// Server
	Server ServerConfig

	// Environment
	Environment string
	LogLevel    string
	Debug       bool

	// IAM/Auth
	Auth AuthConfig

	// Database
	Database DatabaseConfig

	// Cache/Redis
	Cache CacheConfig

	// External Services
	Services ServicesConfig

	// Security
	Security SecurityConfig

	// Rate Limiting
	RateLimit RateLimitConfig

	// Tracing
	Tracing TracingConfig

	// Metrics
	Metrics MetricsConfig

	// CORS
	CORS CORSConfig
}

// ServerConfig represents server configuration
type ServerConfig struct {
	Port              int
	Host              string
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxHeaderBytes    int
	ShutdownTimeout   time.Duration
	GracefulShutdown  bool
}

// AuthConfig represents authentication configuration
type AuthConfig struct {
	JWTSecret              string
	JWTExpiration          time.Duration
	RefreshTokenExpiration time.Duration
	MFARequired            bool
	MFAIssuer              string
	SessionTimeout         time.Duration
	PasswordMinLength      int
	PasswordRequireSpecial bool
	MaxLoginAttempts       int
	LockoutDuration        time.Duration
}

// DatabaseConfig represents database configuration
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxConnections  int
	MinConnections  int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
	LogQueries      bool
}

// CacheConfig represents cache configuration
type CacheConfig struct {
	Enabled           bool
	Type              string // "redis" or "memory"
	TTL               time.Duration
	RedisURL          string
	MaxSize           int64
	EvictionPolicy    string
}

// ServicesConfig represents external services configuration
type ServicesConfig struct {
	IAMService     ServiceEndpoint
	NotifyService  ServiceEndpoint
	ReportService  ServiceEndpoint
	DataService    ServiceEndpoint
	MLService      ServiceEndpoint
	// Registry maps service names to their base URLs for API gateway proxy routing
	Registry map[string]string
}

// ServiceEndpoint represents a service endpoint configuration
type ServiceEndpoint struct {
	URL            string
	Timeout        time.Duration
	RetryAttempts  int
	RetryDelay     time.Duration
	CircuitBreaker CircuitBreakerConfig
}

// CircuitBreakerConfig represents circuit breaker configuration
type CircuitBreakerConfig struct {
	Enabled      bool
	MaxFailures  uint32
	Timeout      time.Duration
	FailureRatio float64
}

// SecurityConfig represents security configuration
type SecurityConfig struct {
	TLSEnabled     bool
	TLSCertFile    string
	TLSKeyFile     string
	HTTPS          bool
	CSRFEnabled    bool
	XSSProtection  bool
	ContentSecurity string
	AllowedOrigins []string
}

// RateLimitConfig represents rate limiting configuration
type RateLimitConfig struct {
	Enabled       bool
	RequestsPerSecond int
	BurstSize     int
	CleanupInterval time.Duration
}

// TracingConfig represents tracing configuration
type TracingConfig struct {
	Enabled          bool
	JaegerEndpoint   string
	SamplingFraction float64
}

// MetricsConfig represents metrics configuration
type MetricsConfig struct {
	Enabled       bool
	Port          int
	Path          string
	HistogramBucket string
}

// CORSConfig represents CORS configuration
type CORSConfig struct {
	Enabled        bool
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	ExposedHeaders []string
	AllowCredentials bool
	MaxAge         int
}

// Load loads configuration from environment variables
func Load() *Config {
	config := &Config{
		Environment: getEnv("ENVIRONMENT", "development"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		Debug:       getEnvBool("DEBUG", false),

		Server: ServerConfig{
			Port:            getEnvInt("SERVER_PORT", 8080),
			Host:            getEnv("SERVER_HOST", "0.0.0.0"),
			ReadTimeout:     getEnvDuration("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getEnvDuration("SERVER_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:     getEnvDuration("SERVER_IDLE_TIMEOUT", 60*time.Second),
			MaxHeaderBytes:  getEnvInt("SERVER_MAX_HEADER_BYTES", 1<<20),
			ShutdownTimeout: getEnvDuration("SERVER_SHUTDOWN_TIMEOUT", 30*time.Second),
			GracefulShutdown: getEnvBool("SERVER_GRACEFUL_SHUTDOWN", true),
		},

		Auth: AuthConfig{
			JWTSecret:              getEnv("JWT_SECRET", "change-me-in-production"),
			JWTExpiration:          getEnvDuration("JWT_EXPIRATION", 15*time.Minute),
			RefreshTokenExpiration: getEnvDuration("REFRESH_TOKEN_EXPIRATION", 7*24*time.Hour),
			MFARequired:            getEnvBool("MFA_REQUIRED", false),
			MFAIssuer:              getEnv("MFA_ISSUER", "ATLAS"),
			SessionTimeout:         getEnvDuration("SESSION_TIMEOUT", 24*time.Hour),
			PasswordMinLength:      getEnvInt("PASSWORD_MIN_LENGTH", 8),
			PasswordRequireSpecial: getEnvBool("PASSWORD_REQUIRE_SPECIAL", true),
			MaxLoginAttempts:       getEnvInt("MAX_LOGIN_ATTEMPTS", 5),
			LockoutDuration:        getEnvDuration("LOCKOUT_DURATION", 15*time.Minute),
		},

		Database: DatabaseConfig{
			Host:            getEnv("DATABASE_HOST", "localhost"),
			Port:            getEnvInt("DATABASE_PORT", 5432),
			User:            getEnv("DATABASE_USER", "postgres"),
			Password:        getEnv("DATABASE_PASSWORD", "postgres"),
			DBName:          getEnv("DATABASE_NAME", "atlas"),
			SSLMode:         getEnv("DATABASE_SSLMODE", "disable"),
			MaxConnections:  getEnvInt("DATABASE_MAX_CONNECTIONS", 25),
			MinConnections:  getEnvInt("DATABASE_MIN_CONNECTIONS", 5),
			ConnMaxLifetime: getEnvDuration("DATABASE_CONN_MAX_LIFETIME", 0),
			ConnMaxIdleTime: getEnvDuration("DATABASE_CONN_MAX_IDLE_TIME", 10*time.Minute),
			LogQueries:      getEnvBool("DATABASE_LOG_QUERIES", false),
		},

		Cache: CacheConfig{
			Enabled:        getEnvBool("CACHE_ENABLED", true),
			Type:           getEnv("CACHE_TYPE", "redis"),
			TTL:            getEnvDuration("CACHE_TTL", 1*time.Hour),
			RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
			MaxSize:        getEnvInt64("CACHE_MAX_SIZE", 1000),
			EvictionPolicy: getEnv("CACHE_EVICTION_POLICY", "lru"),
		},

		Services: ServicesConfig{
			IAMService: ServiceEndpoint{
				URL:           getEnv("IAM_SERVICE_URL", "http://iam-service:8081"),
				Timeout:       getEnvDuration("IAM_SERVICE_TIMEOUT", 10*time.Second),
				RetryAttempts: getEnvInt("IAM_SERVICE_RETRY_ATTEMPTS", 3),
				RetryDelay:    getEnvDuration("IAM_SERVICE_RETRY_DELAY", 100*time.Millisecond),
				CircuitBreaker: CircuitBreakerConfig{
					Enabled:      getEnvBool("IAM_SERVICE_CIRCUIT_BREAKER_ENABLED", true),
					MaxFailures:  uint32(getEnvInt("IAM_SERVICE_CIRCUIT_BREAKER_MAX_FAILURES", 5)),
					Timeout:      getEnvDuration("IAM_SERVICE_CIRCUIT_BREAKER_TIMEOUT", 30*time.Second),
					FailureRatio: 0.6,
				},
			},
			Registry: buildServiceRegistry(),
		},

		Security: SecurityConfig{
			TLSEnabled:      getEnvBool("TLS_ENABLED", false),
			TLSCertFile:     getEnv("TLS_CERT_FILE", "/etc/ssl/certs/cert.pem"),
			TLSKeyFile:      getEnv("TLS_KEY_FILE", "/etc/ssl/private/key.pem"),
			HTTPS:           getEnvBool("HTTPS", false),
			CSRFEnabled:     getEnvBool("CSRF_ENABLED", true),
			XSSProtection:   getEnvBool("XSS_PROTECTION", true),
			ContentSecurity: getEnv("CONTENT_SECURITY_POLICY", "default-src 'self'"),
			AllowedOrigins:  parseStringSlice(getEnv("ALLOWED_ORIGINS", "http://localhost:3000")),
		},

		RateLimit: RateLimitConfig{
			Enabled:          getEnvBool("RATE_LIMIT_ENABLED", true),
			RequestsPerSecond: getEnvInt("RATE_LIMIT_RPS", 100),
			BurstSize:        getEnvInt("RATE_LIMIT_BURST", 50),
			CleanupInterval:  getEnvDuration("RATE_LIMIT_CLEANUP_INTERVAL", 1*time.Minute),
		},

		Tracing: TracingConfig{
			Enabled:          getEnvBool("TRACING_ENABLED", false),
			JaegerEndpoint:   getEnv("JAEGER_ENDPOINT", "localhost:14250"),
			SamplingFraction: getEnvFloat("TRACING_SAMPLING_FRACTION", 0.1),
		},

		Metrics: MetricsConfig{
			Enabled: getEnvBool("METRICS_ENABLED", true),
			Port:    getEnvInt("METRICS_PORT", 9090),
			Path:    getEnv("METRICS_PATH", "/metrics"),
		},

		CORS: CORSConfig{
			Enabled:        getEnvBool("CORS_ENABLED", true),
			AllowedOrigins: parseStringSlice(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
			AllowedMethods: parseStringSlice(getEnv("CORS_ALLOWED_METHODS", "GET,POST,PUT,DELETE,OPTIONS")),
			AllowedHeaders: parseStringSlice(getEnv("CORS_ALLOWED_HEADERS", "Content-Type,Authorization")),
			ExposedHeaders: parseStringSlice(getEnv("CORS_EXPOSED_HEADERS", "X-Total-Count,X-Page-Number")),
			AllowCredentials: getEnvBool("CORS_ALLOW_CREDENTIALS", true),
			MaxAge:         getEnvInt("CORS_MAX_AGE", 86400),
		},
	}

	return config
}

// Helper functions
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

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.Atoi(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseInt(value, 10, 64)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseFloat(value, 64)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		parsed, err := time.ParseDuration(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func parseStringSlice(value string) []string {
	if value == "" {
		return []string{}
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

// buildServiceRegistry creates the service name -> URL mapping from env vars with sensible defaults.
// Each entry can be overridden via SERVICE_<NAME>_URL environment variables.
func buildServiceRegistry() map[string]string {
	defaults := map[string]string{
		// Go services (each uses its own configured port)
		"iam-service":           "http://iam-service:8081",
		"risk-assessment":       "http://risk-assessment:8082",
		"graph-intelligence":    "http://graph-intelligence:8089",
		// Python services (all run on port 8000 via uvicorn)
		"sanctions-screening":      "http://sanctions-screening:8000",
		"scenario-simulation":      "http://scenario-simulation:8000",
		"news-aggregator":          "http://news-aggregator:8000",
		"nlp-service":              "http://nlp-service:8000",
		"ml-infrastructure":        "http://ml-infrastructure:8000",
		"model-serving":            "http://model-serving:8000",
		"model-monitoring":         "http://model-monitoring:8000",
		"xai-service":              "http://xai-service:8000",
		"war-gaming":               "http://war-gaming:8000",
		"digital-twins":            "http://digital-twins:8000",
		"policy-impact":            "http://policy-impact:8000",
		"multi-region":             "http://multi-region:8000",
		"data-residency":           "http://data-residency:8000",
		"federated-learning":       "http://federated-learning:8000",
		"mobile-api":               "http://mobile-api:8000",
		"compliance-automation":    "http://compliance-automation:8000",
		"performance-optimization": "http://performance-optimization:8000",
		"cost-optimization":        "http://cost-optimization:8000",
		"advanced-rd":              "http://advanced-rd:8000",
		"security-certification":   "http://security-certification:8000",
		"continuous-improvement":   "http://continuous-improvement:8000",
		// Internal Go services (Kafka-based, no external port)
		"ingestion-service":     "http://ingestion-service:8080",
		"normalization-service": "http://normalization-service:8080",
		"audit-service":         "http://audit-logging:8080",
	}

	registry := make(map[string]string, len(defaults))
	for name, defaultURL := range defaults {
		envKey := "SERVICE_" + strings.ToUpper(strings.ReplaceAll(name, "-", "_")) + "_URL"
		registry[name] = getEnv(envKey, defaultURL)
	}

	return registry
}
