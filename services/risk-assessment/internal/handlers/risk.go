package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"atlas-core-api/services/risk-assessment/internal/models"
	"atlas-core-api/services/risk-assessment/internal/service"
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
	// TODO: Implement alert configuration
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented"})
}
