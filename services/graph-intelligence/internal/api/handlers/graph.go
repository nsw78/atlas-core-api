package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	models "atlas-core-api/services/graph-intelligence/internal/domain"
	service "atlas-core-api/services/graph-intelligence/internal/application"
)

type GraphHandler struct {
	service service.GraphService
}

func NewGraphHandler(svc service.GraphService) *GraphHandler {
	return &GraphHandler{
		service: svc,
	}
}

func (h *GraphHandler) ResolveEntities(c *gin.Context) {
	var req models.ResolveEntitiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results, err := h.service.ResolveEntities(req.Entities)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"resolved_entities": results})
}

func (h *GraphHandler) GetRelationships(c *gin.Context) {
	entityID := c.Param("id")
	relationshipTypes := c.QueryArray("types")

	relationships, err := h.service.GetRelationships(entityID, relationshipTypes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"relationships": relationships})
}

func (h *GraphHandler) GetNeighbors(c *gin.Context) {
	entityID := c.Param("id")
	depth := 1
	if d := c.Query("depth"); d != "" {
		// TODO: Parse depth
	}

	neighbors, err := h.service.GetNeighbors(entityID, depth)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"neighbors": neighbors})
}

func (h *GraphHandler) PropagateRisk(c *gin.Context) {
	var req models.RiskPropagationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Try query params
		entityID := c.Query("entity_id")
		if entityID != "" {
			req.EntityID = entityID
			req.MaxDepth = 3
			req.Threshold = 0.5
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	result, err := h.service.PropagateRisk(req.EntityID, req.MaxDepth, req.Threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *GraphHandler) PropagateRiskFromEntity(c *gin.Context) {
	var req models.RiskPropagationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.service.PropagateRisk(req.EntityID, req.MaxDepth, req.Threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *GraphHandler) GetCommunities(c *gin.Context) {
	communities, err := h.service.GetCommunities()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"communities": communities})
}

func (h *GraphHandler) GetCentrality(c *gin.Context) {
	entityID := c.Query("entity_id")
	if entityID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entity_id required"})
		return
	}

	result, err := h.service.GetCentrality(entityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *GraphHandler) GetShortestPath(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")

	if from == "" || to == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from and to parameters required"})
		return
	}

	path, err := h.service.GetShortestPath(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"path": path})
}

func (h *GraphHandler) GetStats(c *gin.Context) {
	stats, err := h.service.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
