package service

import (
	models "atlas-core-api/services/audit-logging/internal/domain"
	"atlas-core-api/services/audit-logging/internal/infrastructure/repository"
	"time"

	"github.com/google/uuid"
)

type AuditService interface {
	CreateEvent(req *models.CreateEventRequest, ipAddress, userAgent string) (*models.AuditLog, error)
	GetLog(id string) (*models.AuditLog, error)
	GetLogs(filters repository.QueryFilters) ([]*models.AuditLog, error)
	GetComplianceReport(start, end time.Time) (*models.ComplianceReport, error)
}

type auditService struct {
	repo repository.AuditRepository
}

func NewAuditService(repo repository.AuditRepository) AuditService {
	return &auditService{
		repo: repo,
	}
}

func (s *auditService) CreateEvent(req *models.CreateEventRequest, ipAddress, userAgent string) (*models.AuditLog, error) {
	log := &models.AuditLog{
		ID:         uuid.New().String(),
		EventType:  req.EventType,
		UserID:     req.UserID,
		EntityID:   req.EntityID,
		Action:     req.Action,
		Resource:   req.Resource,
		ResourceID: req.ResourceID,
		IPAddress:  ipAddress,
		UserAgent:   userAgent,
		Metadata:    req.Metadata,
		Timestamp:   time.Now(),
	}

	if err := s.repo.Create(log); err != nil {
		return nil, err
	}

	return log, nil
}

func (s *auditService) GetLog(id string) (*models.AuditLog, error) {
	return s.repo.GetByID(id)
}

func (s *auditService) GetLogs(filters repository.QueryFilters) ([]*models.AuditLog, error) {
	return s.repo.Query(filters)
}

func (s *auditService) GetComplianceReport(start, end time.Time) (*models.ComplianceReport, error) {
	return s.repo.GetComplianceReport(start, end)
}
