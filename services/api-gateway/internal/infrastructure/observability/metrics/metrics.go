package metrics

import (
	"fmt"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"go.uber.org/zap"
)

// Metrics represents all metrics in the system
type Metrics struct {
	// HTTP Request Metrics
	HTTPRequestsTotal       prometheus.CounterVec
	HTTPRequestsDuration    prometheus.HistogramVec
	HTTPRequestsInProgress  prometheus.GaugeVec
	HTTPResponseStatus      prometheus.CounterVec
	HTTPResponseSize        prometheus.HistogramVec

	// Authentication Metrics
	AuthLoginAttempts       prometheus.CounterVec
	AuthLoginSuccesses      prometheus.CounterVec
	AuthLoginFailures       prometheus.CounterVec
	AuthTokenRefreshes      prometheus.Counter

	// Cache Metrics
	CacheHits               prometheus.Counter
	CacheMisses             prometheus.Counter
	CacheOperationDuration  prometheus.HistogramVec

	// Circuit Breaker Metrics
	CircuitBreakerState     prometheus.GaugeVec
	CircuitBreakerTrips     prometheus.CounterVec

	// Service Health Metrics
	ServiceHealthStatus     prometheus.GaugeVec
	ServiceAvailability     prometheus.GaugeVec
	ServiceLatency          prometheus.HistogramVec

	// Business Metrics
	UsersActiveTotal        prometheus.Gauge
	APICallsTotal           prometheus.Counter
	ErrorsTotal             prometheus.CounterVec

	// Database Metrics
	DatabaseConnections     prometheus.Gauge
	DatabaseQueryDuration   prometheus.HistogramVec
	DatabaseErrors          prometheus.CounterVec

	logger *zap.Logger
	mutex  sync.RWMutex
}

// NewMetrics initializes all metrics
func NewMetrics(logger *zap.Logger) *Metrics {
	m := &Metrics{
		HTTPRequestsTotal: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "http",
				Name:      "requests_total",
				Help:      "Total number of HTTP requests",
			},
			[]string{"method", "endpoint", "status"},
		),
		HTTPRequestsDuration: *promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "atlas",
				Subsystem: "http",
				Name:      "request_duration_seconds",
				Help:      "HTTP request latency in seconds",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"method", "endpoint"},
		),
		HTTPRequestsInProgress: *promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "atlas",
				Subsystem: "http",
				Name:      "requests_in_progress",
				Help:      "Number of HTTP requests currently being processed",
			},
			[]string{"method", "endpoint"},
		),
		HTTPResponseStatus: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "http",
				Name:      "response_status_total",
				Help:      "Total responses by status code",
			},
			[]string{"status"},
		),
		HTTPResponseSize: *promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "atlas",
				Subsystem: "http",
				Name:      "response_size_bytes",
				Help:      "HTTP response size in bytes",
				Buckets:   prometheus.ExponentialBuckets(1024, 2, 10),
			},
			[]string{"method", "endpoint"},
		),

		AuthLoginAttempts: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "auth",
				Name:      "login_attempts_total",
				Help:      "Total login attempts",
			},
			[]string{"provider"},
		),
		AuthLoginSuccesses: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "auth",
				Name:      "login_successes_total",
				Help:      "Total successful logins",
			},
			[]string{"provider"},
		),
		AuthLoginFailures: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "auth",
				Name:      "login_failures_total",
				Help:      "Total failed logins",
			},
			[]string{"provider", "reason"},
		),
		AuthTokenRefreshes: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "auth",
				Name:      "token_refreshes_total",
				Help:      "Total token refreshes",
			},
		),

		CacheHits: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "cache",
				Name:      "hits_total",
				Help:      "Total cache hits",
			},
		),
		CacheMisses: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "cache",
				Name:      "misses_total",
				Help:      "Total cache misses",
			},
		),
		CacheOperationDuration: *promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "atlas",
				Subsystem: "cache",
				Name:      "operation_duration_seconds",
				Help:      "Cache operation latency in seconds",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"operation"},
		),

		CircuitBreakerState: *promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "atlas",
				Subsystem: "circuitbreaker",
				Name:      "state",
				Help:      "Circuit breaker state (0=closed, 1=open, 2=half-open)",
			},
			[]string{"name"},
		),
		CircuitBreakerTrips: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "circuitbreaker",
				Name:      "trips_total",
				Help:      "Total circuit breaker trips",
			},
			[]string{"name"},
		),

		ServiceHealthStatus: *promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "atlas",
				Subsystem: "service",
				Name:      "health_status",
				Help:      "Service health status (1=healthy, 0=unhealthy)",
			},
			[]string{"service"},
		),
		ServiceAvailability: *promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Namespace: "atlas",
				Subsystem: "service",
				Name:      "availability_percent",
				Help:      "Service availability percentage",
			},
			[]string{"service"},
		),
		ServiceLatency: *promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "atlas",
				Subsystem: "service",
				Name:      "latency_seconds",
				Help:      "Service latency in seconds",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"service"},
		),

		UsersActiveTotal: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: "atlas",
				Subsystem: "business",
				Name:      "users_active_total",
				Help:      "Total active users",
			},
		),
		APICallsTotal: promauto.NewCounter(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "business",
				Name:      "api_calls_total",
				Help:      "Total API calls",
			},
		),
		ErrorsTotal: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "errors",
				Name:      "total",
				Help:      "Total errors",
			},
			[]string{"type", "code"},
		),

		DatabaseConnections: promauto.NewGauge(
			prometheus.GaugeOpts{
				Namespace: "atlas",
				Subsystem: "database",
				Name:      "connections_total",
				Help:      "Total database connections",
			},
		),
		DatabaseQueryDuration: *promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Namespace: "atlas",
				Subsystem: "database",
				Name:      "query_duration_seconds",
				Help:      "Database query latency in seconds",
				Buckets:   prometheus.DefBuckets,
			},
			[]string{"operation"},
		),
		DatabaseErrors: *promauto.NewCounterVec(
			prometheus.CounterOpts{
				Namespace: "atlas",
				Subsystem: "database",
				Name:      "errors_total",
				Help:      "Total database errors",
			},
			[]string{"operation", "error_type"},
		),

		logger: logger,
	}

	logger.Info("Metrics initialized")
	return m
}

// RecordHTTPRequest records an HTTP request metric
func (m *Metrics) RecordHTTPRequest(method, endpoint string, duration time.Duration, status int, size int64) {
	statusStr := fmt.Sprintf("%d", status)

	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.HTTPRequestsTotal.WithLabelValues(method, endpoint, statusStr).Inc()
	m.HTTPRequestsDuration.WithLabelValues(method, endpoint).Observe(duration.Seconds())
	m.HTTPResponseStatus.WithLabelValues(statusStr).Inc()
	m.HTTPResponseSize.WithLabelValues(method, endpoint).Observe(float64(size))
}

// RecordAuthLogin records an authentication login attempt
func (m *Metrics) RecordAuthLogin(provider string, success bool, reason string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.AuthLoginAttempts.WithLabelValues(provider).Inc()
	if success {
		m.AuthLoginSuccesses.WithLabelValues(provider).Inc()
	} else {
		m.AuthLoginFailures.WithLabelValues(provider, reason).Inc()
	}
}

// RecordTokenRefresh records a token refresh
func (m *Metrics) RecordTokenRefresh() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.AuthTokenRefreshes.Inc()
}

// RecordCacheOperation records a cache operation
func (m *Metrics) RecordCacheOperation(operation string, hit bool, duration time.Duration) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.CacheOperationDuration.WithLabelValues(operation).Observe(duration.Seconds())
	if hit {
		m.CacheHits.Inc()
	} else {
		m.CacheMisses.Inc()
	}
}

// RecordError records an error
func (m *Metrics) RecordError(errorType string, code int) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	codeStr := fmt.Sprintf("%d", code)
	m.ErrorsTotal.WithLabelValues(errorType, codeStr).Inc()
}

// SetServiceHealth sets the health status of a service
func (m *Metrics) SetServiceHealth(service string, healthy bool) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	status := float64(0)
	if healthy {
		status = 1
	}
	m.ServiceHealthStatus.WithLabelValues(service).Set(status)
}

// SetServiceAvailability sets the availability percentage of a service
func (m *Metrics) SetServiceAvailability(service string, percentage float64) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.ServiceAvailability.WithLabelValues(service).Set(percentage)
}

// RecordServiceLatency records service latency
func (m *Metrics) RecordServiceLatency(service string, duration time.Duration) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.ServiceLatency.WithLabelValues(service).Observe(duration.Seconds())
}

// SetActiveUsers sets the number of active users
func (m *Metrics) SetActiveUsers(count int) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.UsersActiveTotal.Set(float64(count))
}

// RecordAPICall records an API call
func (m *Metrics) RecordAPICall() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.APICallsTotal.Inc()
}

// RecordDatabaseQuery records a database query
func (m *Metrics) RecordDatabaseQuery(operation string, duration time.Duration) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.DatabaseQueryDuration.WithLabelValues(operation).Observe(duration.Seconds())
}

// RecordDatabaseError records a database error
func (m *Metrics) RecordDatabaseError(operation string, errorType string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.DatabaseErrors.WithLabelValues(operation, errorType).Inc()
}
