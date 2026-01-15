package repository

import (
	models "atlas-core-api/services/risk-assessment/internal/domain"
	"sync"
	"time"
)

type RiskRepository interface {
	Create(assessment *models.RiskAssessment) error
	GetByID(id string) (*models.RiskAssessment, error)
	GetByEntityID(entityID string, limit int) ([]*models.RiskAssessment, error)
	GetTrends(entityID, dimension, period string) ([]*models.RiskAssessment, error)
	ListAlerts(activeOnly bool) ([]*models.RiskAlert, error)
	CreateAlert(alert *models.RiskAlert) error
	UpdateAlert(id string, alert *models.RiskAlert) error
	DeleteAlert(id string) error
}

type inMemoryRiskRepository struct {
	assessments map[string]*models.RiskAssessment
	alerts      map[string]*models.RiskAlert
	mu          sync.RWMutex
}

func NewRiskRepository() RiskRepository {
	return &inMemoryRiskRepository{
		assessments: make(map[string]*models.RiskAssessment),
		alerts:      make(map[string]*models.RiskAlert),
	}
}

func (r *inMemoryRiskRepository) Create(assessment *models.RiskAssessment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.assessments[assessment.ID] = assessment
	return nil
}

func (r *inMemoryRiskRepository) GetByID(id string) (*models.RiskAssessment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	assessment, exists := r.assessments[id]
	if !exists {
		return nil, ErrNotFound
	}
	return assessment, nil
}

func (r *inMemoryRiskRepository) GetByEntityID(entityID string, limit int) ([]*models.RiskAssessment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	results := make([]*models.RiskAssessment, 0)
	for _, assessment := range r.assessments {
		if assessment.EntityID == entityID {
			results = append(results, assessment)
		}
	}
	
	// Sort by timestamp descending
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[i].Timestamp.Before(results[j].Timestamp) {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
	
	if limit > 0 && limit < len(results) {
		return results[:limit], nil
	}
	return results, nil
}

func (r *inMemoryRiskRepository) GetTrends(entityID, dimension, period string) ([]*models.RiskAssessment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	// Calculate time window based on period
	now := time.Now()
	var startTime time.Time
	switch period {
	case "7d":
		startTime = now.AddDate(0, 0, -7)
	case "30d":
		startTime = now.AddDate(0, 0, -30)
	case "90d":
		startTime = now.AddDate(0, 0, -90)
	default:
		startTime = now.AddDate(0, 0, -30) // Default to 30 days
	}
	
	results := make([]*models.RiskAssessment, 0)
	for _, assessment := range r.assessments {
		if assessment.EntityID == entityID && assessment.Timestamp.After(startTime) {
			if dimension == "" || assessment.Dimensions[dimension].Name != "" {
				results = append(results, assessment)
			}
		}
	}
	
	// Sort by timestamp ascending
	for i := 0; i < len(results)-1; i++ {
		for j := i + 1; j < len(results); j++ {
			if results[i].Timestamp.After(results[j].Timestamp) {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
	
	return results, nil
}

func (r *inMemoryRiskRepository) ListAlerts(activeOnly bool) ([]*models.RiskAlert, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	
	results := make([]*models.RiskAlert, 0)
	for _, alert := range r.alerts {
		if !activeOnly || alert.Active {
			results = append(results, alert)
		}
	}
	return results, nil
}

func (r *inMemoryRiskRepository) CreateAlert(alert *models.RiskAlert) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.alerts[alert.ID] = alert
	return nil
}

func (r *inMemoryRiskRepository) UpdateAlert(id string, alert *models.RiskAlert) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if _, exists := r.alerts[id]; !exists {
		return ErrNotFound
	}
	r.alerts[id] = alert
	return nil
}

func (r *inMemoryRiskRepository) DeleteAlert(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	if _, exists := r.alerts[id]; !exists {
		return ErrNotFound
	}
	delete(r.alerts, id)
	return nil
}

var ErrNotFound = &RepositoryError{Message: "not found"}

type RepositoryError struct {
	Message string
}

func (e *RepositoryError) Error() string {
	return e.Message
}
