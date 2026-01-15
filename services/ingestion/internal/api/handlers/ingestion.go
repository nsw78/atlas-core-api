package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	service "atlas-core-api/services/ingestion/internal/application"
	models "atlas-core-api/services/ingestion/internal/domain"
)

type IngestionHandler struct {
	service         service.IngestionService
	sourceProcessor *service.SourceProcessor
}

func NewIngestionHandler(svc service.IngestionService, processor *service.SourceProcessor) *IngestionHandler {
	return &IngestionHandler{
		service:         svc,
		sourceProcessor: processor,
	}
}

type RegisterSourceRequest struct {
	Name   string                 `json:"name" binding:"required"`
	Type   models.SourceType       `json:"type" binding:"required"`
	Config map[string]interface{} `json:"config"`
}

type IngestDataRequest struct {
	Data map[string]interface{} `json:"data" binding:"required"`
}

func (h *IngestionHandler) RegisterSource(c *gin.Context) {
	var req RegisterSourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	source, err := h.service.RegisterSource(req.Name, req.Type, req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, source)
}

func (h *IngestionHandler) GetSource(c *gin.Context) {
	id := c.Param("id")
	
	source, err := h.service.GetSource(id)
	if err != nil {
		if err.Error() == "source not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "source not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, source)
}

func (h *IngestionHandler) ListSources(c *gin.Context) {
	sources, err := h.service.ListSources()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sources": sources})
}

func (h *IngestionHandler) IngestData(c *gin.Context) {
	sourceID := c.Param("id")
	
	var req IngestDataRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ingested, err := h.service.IngestData(sourceID, req.Data)
	if err != nil {
		if err.Error() == "source not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "source not found"})
			return
		}
		if err.Error() == "invalid data format" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid data format"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ingested)
}

func (h *IngestionHandler) GetStatus(c *gin.Context) {
	status, err := h.service.GetStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

func (h *IngestionHandler) TriggerIngestion(c *gin.Context) {
	sourceID := c.Param("id")

	if h.sourceProcessor == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "source processor not available"})
		return
	}

	if err := h.sourceProcessor.ProcessSource(sourceID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ingestion triggered successfully", "source_id": sourceID})
}
