package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestHealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	logger, _ := zap.NewDevelopment()
	handler := NewHealthCheckHandler(logger, nil)

	w := httptest.NewRecorder()
	_, r := gin.CreateTestContext(w)

	r.GET("/health", handler.HealthCheck)

	req := httptest.NewRequest("GET", "/health", nil)

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.Equal(t, "healthy", response["status"])
}
