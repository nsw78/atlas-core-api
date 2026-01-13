package router

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"atlas-core-api/services/api-gateway/internal/config"
)

func SetupRoutes(r *gin.RouterGroup, cfg *config.Config) {
	// Risk Assessment routes
	risks := r.Group("/risks")
	{
		risks.POST("/assess", proxyToService(cfg, "risk-assessment", "/api/v1/risks/assess"))
		risks.GET("/:id", proxyToService(cfg, "risk-assessment", "/api/v1/risks/:id"))
		risks.GET("/trends", proxyToService(cfg, "risk-assessment", "/api/v1/risks/trends"))
		risks.POST("/alerts", proxyToService(cfg, "risk-assessment", "/api/v1/risks/alerts"))
	}

	// Scenario Simulation routes
	scenarios := r.Group("/scenarios")
	{
		scenarios.POST("", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios"))
		scenarios.POST("/:id/run", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios/:id/run"))
		scenarios.GET("/:id/results", proxyToService(cfg, "scenario-simulation", "/api/v1/scenarios/:id/results"))
	}

	// News routes
	news := r.Group("/news")
	{
		news.GET("/articles", proxyToService(cfg, "news-aggregator", "/api/v1/news/articles"))
		news.POST("/sources", proxyToService(cfg, "news-aggregator", "/api/v1/news/sources"))
	}
}

func proxyToService(cfg *config.Config, serviceName, backendPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple HTTP proxy to backend services
		serviceURLs := map[string]string{
			"risk-assessment":     "http://risk-assessment:8082",
			"scenario-simulation": "http://scenario-simulation:8084",
			"news-aggregator":     "http://news-aggregator:8083",
		}

		baseURL, exists := serviceURLs[serviceName]
		if !exists {
			c.JSON(404, gin.H{"error": "Service not found", "service": serviceName})
			return
		}

		// Replace path parameters
		finalPath := backendPath
		for _, param := range c.Params {
			finalPath = strings.Replace(finalPath, ":"+param.Key, param.Value, 1)
		}

		// Add query string
		if c.Request.URL.RawQuery != "" {
			finalPath += "?" + c.Request.URL.RawQuery
		}

		// Forward request to backend service
		client := &http.Client{Timeout: 30 * time.Second}
		req, err := http.NewRequest(c.Request.Method, baseURL+finalPath, c.Request.Body)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to create request"})
			return
		}

		// Copy headers (except Host)
		for key, values := range c.Request.Header {
			if key != "Host" {
				for _, value := range values {
					req.Header.Add(key, value)
				}
			}
		}

		resp, err := client.Do(req)
		if err != nil {
			c.JSON(502, gin.H{"error": "Service unavailable", "service": serviceName, "details": err.Error()})
			return
		}
		defer resp.Body.Close()

		// Copy response headers
		for key, values := range resp.Header {
			for _, value := range values {
				c.Header(key, value)
			}
		}

		// Copy response body
		body, _ := io.ReadAll(resp.Body)
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), body)
	}
}
