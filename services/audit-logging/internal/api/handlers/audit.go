package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	models "atlas-core-api/services/audit-logging/internal/domain"
	"atlas-core-api/services/audit-logging/internal/infrastructure/repository"
	service "atlas-core-api/services/audit-logging/internal/application"
)

type AuditHandler struct {
	service service.AuditService
}

func NewAuditHandler(svc service.AuditService) *AuditHandler {
	return &AuditHandler{
		service: svc,
	}
}

func (h *AuditHandler) CreateEvent(c *gin.Context) {
	var req models.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	log, err := h.service.CreateEvent(&req, ipAddress, userAgent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, log)
}

func (h *AuditHandler) GetLog(c *gin.Context) {
	id := c.Param("id")

	log, err := h.service.GetLog(id)
	if err != nil {
		if err.Error() == "audit log not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "audit log not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, log)
}

func (h *AuditHandler) GetLogs(c *gin.Context) {
	filters := repository.QueryFilters{
		Limit:  100,
		Offset: 0,
	}

	// Parse query parameters
	if userID := c.Query("user_id"); userID != "" {
		filters.UserID = userID
	}
	if eventType := c.Query("event_type"); eventType != "" {
		filters.EventType = eventType
	}
	if resource := c.Query("resource"); resource != "" {
		filters.Resource = resource
	}
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse(time.RFC3339, startDateStr); err == nil {
			filters.StartDate = &startDate
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse(time.RFC3339, endDateStr); err == nil {
			filters.EndDate = &endDate
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filters.Offset = offset
		}
	}

	logs, err := h.service.GetLogs(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"logs": logs, "count": len(logs)})
}

func (h *AuditHandler) GetComplianceReport(c *gin.Context) {
	// Default to last 30 days
	end := time.Now()
	start := end.AddDate(0, 0, -30)

	// Parse query parameters
	if startStr := c.Query("start_date"); startStr != "" {
		if parsed, err := time.Parse(time.RFC3339, startStr); err == nil {
			start = parsed
		}
	}
	if endStr := c.Query("end_date"); endStr != "" {
		if parsed, err := time.Parse(time.RFC3339, endStr); err == nil {
			end = parsed
		}
	}

	report, err := h.service.GetComplianceReport(start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}
