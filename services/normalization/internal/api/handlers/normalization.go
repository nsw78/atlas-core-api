package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	models "atlas-core-api/services/normalization/internal/domain"
	service "atlas-core-api/services/normalization/internal/application"
)

type NormalizationHandler struct {
	service service.NormalizationService
}

func NewNormalizationHandler(svc service.NormalizationService) *NormalizationHandler {
	return &NormalizationHandler{
		service: svc,
	}
}

func (h *NormalizationHandler) CreateRule(c *gin.Context) {
	var rule models.NormalizationRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.CreateRule(&rule); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, rule)
}

func (h *NormalizationHandler) GetRule(c *gin.Context) {
	id := c.Param("id")

	rule, err := h.service.GetRule(id)
	if err != nil {
		if err.Error() == "rule not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "rule not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rule)
}

func (h *NormalizationHandler) ListRules(c *gin.Context) {
	rules, err := h.service.ListRules()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"rules": rules})
}

func (h *NormalizationHandler) UpdateRule(c *gin.Context) {
	id := c.Param("id")

	var rule models.NormalizationRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateRule(id, &rule); err != nil {
		if err.Error() == "rule not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "rule not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rule)
}

func (h *NormalizationHandler) DeleteRule(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.DeleteRule(id); err != nil {
		if err.Error() == "rule not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "rule not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *NormalizationHandler) GetQuality(c *gin.Context) {
	dataID := c.Param("data_id")

	quality, err := h.service.GetQuality(dataID)
	if err != nil {
		if err.Error() == "quality data not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "quality data not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, quality)
}

func (h *NormalizationHandler) GetStats(c *gin.Context) {
	stats, err := h.service.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
