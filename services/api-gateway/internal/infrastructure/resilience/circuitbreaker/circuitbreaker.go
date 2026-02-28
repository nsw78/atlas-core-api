package circuitbreaker

import (
	"context"
	"fmt"
	"time"

	"github.com/sony/gobreaker"
	"go.uber.org/zap"
)

// CircuitBreaker is the interface for circuit breaker operations
type CircuitBreaker interface {
	Execute(ctx context.Context, f func() error) error
	Health() string
	Reset()
}

// GoCircuitBreaker implements CircuitBreaker using Sony's gobreaker library
type GoCircuitBreaker struct {
	breaker *gobreaker.CircuitBreaker
	logger  *zap.Logger
	name    string
}

// NewGoCircuitBreaker creates a new Sony circuit breaker
func NewGoCircuitBreaker(name string, maxFailures uint32, timeout time.Duration, logger *zap.Logger) *GoCircuitBreaker {
	settings := gobreaker.Settings{
		Name:        name,
		MaxRequests: 2,
		Interval:    time.Second,
		Timeout:     timeout,
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 3 && failureRatio >= 0.6
		},
	}

	breaker := gobreaker.NewCircuitBreaker(settings)

	logger.Info("Circuit breaker created",
		zap.String("name", name),
		zap.Duration("timeout", timeout),
	)

	return &GoCircuitBreaker{
		breaker: breaker,
		logger:  logger,
		name:    name,
	}
}

// Execute executes a function with circuit breaker protection
func (cb *GoCircuitBreaker) Execute(ctx context.Context, f func() error) error {
	_, err := cb.breaker.Execute(func() (interface{}, error) {
		// Create a channel for the result
		errChan := make(chan error, 1)

		// Run the function in a goroutine
		go func() {
			errChan <- f()
		}()

		// Wait for completion or context cancellation
		select {
		case err := <-errChan:
			return nil, err
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	})

	if err != nil {
		if err == gobreaker.ErrOpenState {
			cb.logger.Warn("Circuit breaker is open", zap.String("name", cb.name))
		} else if err == gobreaker.ErrTooManyRequests {
			cb.logger.Warn("Too many requests, circuit breaker half-open", zap.String("name", cb.name))
		} else {
			cb.logger.Error("Circuit breaker error", zap.String("name", cb.name), zap.Error(err))
		}
	}

	return err
}

// Health returns the health status of the circuit breaker
func (cb *GoCircuitBreaker) Health() string {
	state := cb.breaker.State()
	switch state {
	case gobreaker.StateClosed:
		return "healthy"
	case gobreaker.StateOpen:
		return "open"
	case gobreaker.StateHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// Reset resets the circuit breaker (no-op for gobreaker v0.5)
func (cb *GoCircuitBreaker) Reset() {
	cb.logger.Info("Circuit breaker reset requested", zap.String("name", cb.name))
}

// CircuitBreakerPool manages multiple circuit breakers
type CircuitBreakerPool struct {
	breakers map[string]CircuitBreaker
	logger   *zap.Logger
}

// NewCircuitBreakerPool creates a new circuit breaker pool
func NewCircuitBreakerPool(logger *zap.Logger) *CircuitBreakerPool {
	return &CircuitBreakerPool{
		breakers: make(map[string]CircuitBreaker),
		logger:   logger,
	}
}

// Register registers a circuit breaker in the pool
func (p *CircuitBreakerPool) Register(name string, breaker CircuitBreaker) {
	p.breakers[name] = breaker
	p.logger.Info("Circuit breaker registered", zap.String("name", name))
}

// Get gets a circuit breaker from the pool
func (p *CircuitBreakerPool) Get(name string) (CircuitBreaker, error) {
	breaker, exists := p.breakers[name]
	if !exists {
		return nil, fmt.Errorf("circuit breaker not found: %s", name)
	}
	return breaker, nil
}

// Execute executes a function with a circuit breaker from the pool
func (p *CircuitBreakerPool) Execute(ctx context.Context, name string, f func() error) error {
	breaker, err := p.Get(name)
	if err != nil {
		return err
	}
	return breaker.Execute(ctx, f)
}

// Health returns the health status of all circuit breakers
func (p *CircuitBreakerPool) Health() map[string]string {
	health := make(map[string]string)
	for name, breaker := range p.breakers {
		health[name] = breaker.Health()
	}
	return health
}

// ResetAll resets all circuit breakers
func (p *CircuitBreakerPool) ResetAll() {
	for _, breaker := range p.breakers {
		breaker.Reset()
	}
	p.logger.Info("All circuit breakers reset")
}

// Retry configuration
type RetryConfig struct {
	MaxAttempts int
	InitialDelay time.Duration
	MaxDelay    time.Duration
	Multiplier  float64
}

// DefaultRetryConfig returns default retry configuration
func DefaultRetryConfig() *RetryConfig {
	return &RetryConfig{
		MaxAttempts:  3,
		InitialDelay: 100 * time.Millisecond,
		MaxDelay:     5 * time.Second,
		Multiplier:   2.0,
	}
}

// RetryWithBackoff executes a function with exponential backoff retry
func RetryWithBackoff(ctx context.Context, config *RetryConfig, f func() error, logger *zap.Logger) error {
	var lastErr error
	delay := config.InitialDelay

	for attempt := 0; attempt < config.MaxAttempts; attempt++ {
		// Check context before attempting
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err := f()
		if err == nil {
			return nil
		}

		lastErr = err
		logger.Warn("Retry attempt failed",
			zap.Int("attempt", attempt+1),
			zap.Int("max_attempts", config.MaxAttempts),
			zap.Error(err),
			zap.Duration("next_delay", delay),
		)

		if attempt < config.MaxAttempts-1 {
			select {
			case <-time.After(delay):
				// Calculate next delay with exponential backoff
				delay = time.Duration(float64(delay) * config.Multiplier)
				if delay > config.MaxDelay {
					delay = config.MaxDelay
				}
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	return fmt.Errorf("max retries exceeded: %w", lastErr)
}
