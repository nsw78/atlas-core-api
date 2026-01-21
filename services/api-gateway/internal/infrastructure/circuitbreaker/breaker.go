package circuitbreaker

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sony/gobreaker"
)

var (
	breakers = make(map[string]*gobreaker.CircuitBreaker)
	mu       sync.RWMutex
)

// GetBreaker returns a circuit breaker for a given service
func GetBreaker(serviceName string) *gobreaker.CircuitBreaker {
	mu.RLock()
	if breaker, exists := breakers[serviceName]; exists {
		mu.RUnlock()
		return breaker
	}
	mu.RUnlock()

	mu.Lock()
	defer mu.Unlock()

	// Double-check after acquiring write lock
	if breaker, exists := breakers[serviceName]; exists {
		return breaker
	}

	// Create new circuit breaker with settings
	settings := gobreaker.Settings{
		Name:        serviceName,
		MaxRequests: 3,                // Half-open state: allow 3 requests
		Interval:    10 * time.Second, // Clear counts after 10s
		Timeout:     30 * time.Second, // Try to close after 30s in open state
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.6 // 60% failure rate
		},
		OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
			fmt.Printf("Circuit breaker '%s' changed from %s to %s\n", name, from, to)
		},
	}

	breaker := gobreaker.NewCircuitBreaker(settings)
	breakers[serviceName] = breaker
	return breaker
}

// DoHTTPRequest executes an HTTP request with circuit breaker protection
func DoHTTPRequest(serviceName string, req *http.Request) (*http.Response, error) {
	breaker := GetBreaker(serviceName)

	result, err := breaker.Execute(func() (interface{}, error) {
		client := &http.Client{Timeout: 30 * time.Second}
		return client.Do(req)
	})

	if err != nil {
		return nil, err
	}

	return result.(*http.Response), nil
}
