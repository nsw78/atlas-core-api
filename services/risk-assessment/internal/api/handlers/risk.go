package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	models "atlas-core-api/services/risk-assessment/internal/domain"
	service "atlas-core-api/services/risk-assessment/internal/application"
)

type RiskHandler struct {
	riskService *service.RiskAssessmentService
}

func NewRiskHandler(riskService *service.RiskAssessmentService) *RiskHandler {
	return &RiskHandler{riskService: riskService}
}

func (h *RiskHandler) AssessRisk(c *gin.Context) {
	var req models.AssessRiskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assessment, err := h.riskService.AssessRisk(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assessment})
}

func (h *RiskHandler) GetRiskAssessment(c *gin.Context) {
	id := c.Param("id")
	
	assessment, err := h.riskService.GetRiskAssessment(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Risk assessment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assessment})
}

func (h *RiskHandler) GetRiskTrends(c *gin.Context) {
	entityID := c.Query("entity_id")
	dimension := c.Query("dimension")
	period := c.Query("period")

	trends, err := h.riskService.GetRiskTrends(entityID, dimension, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": trends})
}

func (h *RiskHandler) ConfigureAlert(c *gin.Context) {
	var config models.AlertConfiguration
	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	alert, err := h.riskService.ConfigureAlert(&config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": alert})
}

func (h *RiskHandler) ListAlerts(c *gin.Context) {
	activeOnly := c.Query("active_only") == "true"
	
	alerts, err := h.riskService.ListAlerts(activeOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alerts})
}

func (h *RiskHandler) DeleteAlert(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.riskService.DeleteAlert(id); err != nil {
		if err.Error() == "not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "alert not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *RiskHandler) GetAssessmentsByEntity(c *gin.Context) {
	entityID := c.Param("entity_id")
	limit := 10
	
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil {
			limit = parsed
		}
	}

	assessments, err := h.riskService.GetAssessmentsByEntity(entityID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assessments})
}
