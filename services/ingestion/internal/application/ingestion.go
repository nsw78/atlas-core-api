package service

import (
	models "atlas-core-api/services/ingestion/internal/domain"
	"atlas-core-api/services/ingestion/internal/infrastructure/repository"
	"encoding/json"
	"sync"
	"time"

	"github.com/google/uuid"
)

type IngestionService interface {
	RegisterSource(name string, sourceType models.SourceType, config map[string]interface{}) (*models.DataSource, error)
	GetSource(id string) (*models.DataSource, error)
	ListSources() ([]*models.DataSource, error)
	IngestData(sourceID string, data map[string]interface{}) (*models.IngestedData, error)
	GetStatus() (*models.IngestionStatus, error)
}

type ingestionService struct {
	repo          repository.SourceRepository
	kafkaProducer KafkaProducer
	ingestedCount int64
	mu            sync.RWMutex
}

func NewIngestionService(repo repository.SourceRepository, kafkaProducer KafkaProducer) IngestionService {
	return &ingestionService{
		repo:          repo,
		kafkaProducer: kafkaProducer,
		ingestedCount: 0,
	}
}

func (s *ingestionService) RegisterSource(name string, sourceType models.SourceType, config map[string]interface{}) (*models.DataSource, error) {
	source := &models.DataSource{
		ID:        uuid.New().String(),
		Name:      name,
		Type:      sourceType,
		Config:    config,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.Create(source); err != nil {
		return nil, err
	}

	return source, nil
}

func (s *ingestionService) GetSource(id string) (*models.DataSource, error) {
	return s.repo.GetByID(id)
}

func (s *ingestionService) ListSources() ([]*models.DataSource, error) {
	return s.repo.List()
}

func (s *ingestionService) IngestData(sourceID string, data map[string]interface{}) (*models.IngestedData, error) {
	// Validate source exists
	source, err := s.repo.GetByID(sourceID)
	if err != nil {
		return nil, err
	}

	// Validate data format
	if err := s.validateData(data, source.Type); err != nil {
		return nil, err
	}

	// Create ingested data record
	ingested := &models.IngestedData{
		ID:         uuid.New().String(),
		SourceID:   sourceID,
		Data:       data,
		IngestedAt: time.Now(),
		Metadata: models.DataMetadata{
			Source:     source.Name,
			Timestamp:  time.Now(),
			Provenance: string(source.Type),
			Format:     "json",
			Schema:     "v1",
			Quality:    1.0, // Will be calculated by normalization service
		},
	}

	// Publish to Kafka
	message, err := json.Marshal(ingested)
	if err != nil {
		return nil, err
	}

	if err := s.kafkaProducer.Publish("raw-data", ingested.ID, message); err != nil {
		return nil, err
	}

	// Update source last sync
	s.repo.UpdateLastSync(sourceID, time.Now())

	// Increment counter
	s.mu.Lock()
	s.ingestedCount++
	s.mu.Unlock()

	return ingested, nil
}

func (s *ingestionService) GetStatus() (*models.IngestionStatus, error) {
	sources, err := s.repo.List()
	if err != nil {
		return nil, err
	}

	activeCount := 0
	sourcesStatus := make([]models.SourceStatus, 0, len(sources))
	
	for _, source := range sources {
		if source.Status == "active" {
			activeCount++
		}
		sourcesStatus = append(sourcesStatus, models.SourceStatus{
			SourceID:    source.ID,
			Name:        source.Name,
			Status:      source.Status,
			LastSync:    source.LastSync,
			Ingested24h: 0, // TODO: Track per source
			ErrorCount:  0, // TODO: Track errors
		})
	}

	s.mu.RLock()
	totalIngested := s.ingestedCount
	s.mu.RUnlock()

	return &models.IngestionStatus{
		TotalSources:  len(sources),
		ActiveSources:  activeCount,
		TotalIngested:  totalIngested,
		Last24Hours:   0, // TODO: Track time-based metrics
		ErrorRate:     0.0,
		SourcesStatus:  sourcesStatus,
	}, nil
}

func (s *ingestionService) validateData(data map[string]interface{}, sourceType models.SourceType) error {
	// Basic validation - can be extended
	if len(data) == 0 {
		return ErrInvalidData
	}
	return nil
}

var ErrInvalidData = &ServiceError{Message: "invalid data format"}

type ServiceError struct {
	Message string
}

func (e *ServiceError) Error() string {
	return e.Message
}
