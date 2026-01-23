package proxy

import (
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Service represents a downstream service that the gateway can proxy to.
type Service struct {
	Name string
	URL  *url.URL
}

// NewService creates a new Service instance.
func NewService(name, rawURL string, logger *zap.Logger) (*Service, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		logger.Error("Failed to parse service URL", zap.String("service", name), zap.String("url", rawURL), zap.Error(err))
		return nil, fmt.Errorf("invalid URL for service %s: %w", name, err)
	}
	return &Service{Name: name, URL: parsedURL}, nil
}

// ForwardRequest proxies the incoming request to the specified downstream service.
func (s *Service) ForwardRequest(c *gin.Context) {
	// Create a new request to the downstream service
	targetURL := s.URL.ResolveReference(c.Request.URL)
	
	// Create a new request
	proxyReq, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, targetURL.String(), c.Request.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}

	// Copy headers from the original request
	proxyReq.Header = make(http.Header)
	for h, val := range c.Request.Header {
		proxyReq.Header[h] = val
	}

	// Add X-Forwarded-For header
	proxyReq.Header.Set("X-Forwarded-For", c.ClientIP())

	// Create a new HTTP client and send the request
	client := &http.Client{}
	resp, err := client.Do(proxyReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to proxy request to service"})
		return
	}
	defer resp.Body.Close()

	// Copy the response from the downstream service to the client
	c.Status(resp.StatusCode)
	for h, val := range resp.Header {
		c.Header(h, val[0])
	}
	io.Copy(c.Writer, resp.Body)
}
