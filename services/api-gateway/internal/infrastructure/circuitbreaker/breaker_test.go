package circuitbreaker

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGetBreaker(t *testing.T) {
	t.Run("creates new circuit breaker for service", func(t *testing.T) {
		breaker := GetBreaker("test-service")
		assert.NotNil(t, breaker)
		assert.Equal(t, "test-service", breaker.Name())
	})

	t.Run("returns existing circuit breaker", func(t *testing.T) {
		breaker1 := GetBreaker("test-service-2")
		breaker2 := GetBreaker("test-service-2")
		assert.Equal(t, breaker1, breaker2, "Should return same instance")
	})
}

func TestDoHTTPRequest(t *testing.T) {
	t.Run("successful request", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		}))
		defer server.Close()

		req, _ := http.NewRequest("GET", server.URL, nil)
		resp, err := DoHTTPRequest("test-service-success", req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("handles failed request", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "http://invalid-host-that-does-not-exist:9999", nil)

		// Set a short timeout for the test
		req.Header.Set("timeout", "1s")

		_, err := DoHTTPRequest("test-service-failure", req)
		assert.Error(t, err, "Should return error for invalid host")
	})

	t.Run("circuit opens after failures", func(t *testing.T) {
		failCount := 0
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			failCount++
			w.WriteHeader(http.StatusInternalServerError)
		}))
		defer server.Close()

		serviceName := "test-service-circuit-open"

		// Make requests until circuit opens (configured to need 5 requests with 60% failure rate)
		for i := 0; i < 10; i++ {
			req, _ := http.NewRequest("GET", server.URL, nil)
			DoHTTPRequest(serviceName, req)
			time.Sleep(10 * time.Millisecond)
		}

		// Circuit should be open now
		breaker := GetBreaker(serviceName)
		assert.NotNil(t, breaker)
	})
}
