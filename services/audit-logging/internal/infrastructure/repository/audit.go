package repository

import (
	models "atlas-core-api/services/audit-logging/internal/domain"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

type AuditRepository interface {
	Create(log *models.AuditLog) error
	GetByID(id string) (*models.AuditLog, error)
	Query(filters QueryFilters) ([]*models.AuditLog, error)
	GetComplianceReport(start, end time.Time) (*models.ComplianceReport, error)
}

type QueryFilters struct {
	UserID    string
	EventType string
	Resource  string
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

type inMemoryAuditRepository struct {
	logs []*models.AuditLog
	mu   sync.RWMutex
}

func NewAuditRepository() AuditRepository {
	return &inMemoryAuditRepository{
		logs: make([]*models.AuditLog, 0),
	}
}

func (r *inMemoryAuditRepository) Create(log *models.AuditLog) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Calculate hash for immutability
	hash := r.calculateHash(log)
	log.Hash = hash

	r.logs = append(r.logs, log)
	return nil
}

func (r *inMemoryAuditRepository) calculateHash(log *models.AuditLog) string {
	// Create a deterministic hash from log content
	data, _ := json.Marshal(log)
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

func (r *inMemoryAuditRepository) GetByID(id string) (*models.AuditLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, log := range r.logs {
		if log.ID == id {
			return log, nil
		}
	}
	return nil, ErrNotFound
}

func (r *inMemoryAuditRepository) Query(filters QueryFilters) ([]*models.AuditLog, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	results := make([]*models.AuditLog, 0)

	for _, log := range r.logs {
		// Apply filters
		if filters.UserID != "" && log.UserID != filters.UserID {
			continue
		}
		if filters.EventType != "" && string(log.EventType) != filters.EventType {
			continue
		}
		if filters.Resource != "" && log.Resource != filters.Resource {
			continue
		}
		if filters.StartDate != nil && log.Timestamp.Before(*filters.StartDate) {
			continue
		}
		if filters.EndDate != nil && log.Timestamp.After(*filters.EndDate) {
			continue
		}

		results = append(results, log)
	}

	// Apply pagination
	start := filters.Offset
	if start > len(results) {
		start = len(results)
	}
	end := start + filters.Limit
	if end > len(results) {
		end = len(results)
	}

	if start >= len(results) {
		return []*models.AuditLog{}, nil
	}

	return results[start:end], nil
}

func (r *inMemoryAuditRepository) GetComplianceReport(start, end time.Time) (*models.ComplianceReport, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	eventTypes := make(map[string]int64)
	userActivity := make(map[string]*models.UserActivity)
	dataAccess := make(map[string]int64)
	totalEvents := int64(0)

	for _, log := range r.logs {
		if log.Timestamp.Before(start) || log.Timestamp.After(end) {
			continue
		}

		totalEvents++

		// Count event types
		eventTypes[string(log.EventType)]++

		// Track user activity
		if ua, exists := userActivity[log.UserID]; exists {
			ua.EventCount++
			if log.Timestamp.After(ua.LastActivity) {
				ua.LastActivity = log.Timestamp
			}
		} else {
			userActivity[log.UserID] = &models.UserActivity{
				UserID:      log.UserID,
				EventCount:  1,
				LastActivity: log.Timestamp,
			}
		}

		// Track data access
		if log.EventType == models.EventTypeDataAccess {
			dataAccess[log.Resource]++
		}
	}

	// Convert user activity map to slice
	users := make([]models.UserActivity, 0, len(userActivity))
	for _, ua := range userActivity {
		users = append(users, *ua)
	}

	// Build report
	report := &models.ComplianceReport{
		PeriodStart: start,
		PeriodEnd:   end,
		TotalEvents: totalEvents,
		EventTypes:  eventTypes,
		Users:       users,
		DataAccess: models.DataAccessSummary{
			TotalAccesses:   int64(len(dataAccess)),
			UniqueResources: int64(len(dataAccess)),
			AccessByType:    dataAccess,
		},
		Compliance: models.ComplianceStatus{
			GDPRCompliant: true, // TODO: Implement actual compliance checks
			LGPDCompliant: true,
			Issues:        []string{},
			LastAudit:     time.Now(),
		},
		Anomalies: []models.Anomaly{}, // TODO: Implement anomaly detection
	}

	return report, nil
}

var ErrNotFound = &RepositoryError{Message: "audit log not found"}

type RepositoryError struct {
	Message string
}

func (e *RepositoryError) Error() string {
	return e.Message
}
