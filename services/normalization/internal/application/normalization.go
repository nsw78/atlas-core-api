package service

import (
	models "atlas-core-api/services/normalization/internal/domain"
	"atlas-core-api/services/normalization/internal/infrastructure/messaging"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

type NormalizationService interface {
	StartConsuming(ctx context.Context) error
	StopConsuming()
	ProcessData(rawData []byte) (*models.NormalizedData, error)
	CreateRule(rule *models.NormalizationRule) error
	GetRule(id string) (*models.NormalizationRule, error)
	ListRules() ([]*models.NormalizationRule, error)
	UpdateRule(id string, rule *models.NormalizationRule) error
	DeleteRule(id string) error
	GetQuality(dataID string) (*models.QualityScore, error)
	GetStats() (*models.NormalizationStats, error)
}

type normalizationService struct {
	consumer         messaging.KafkaConsumer
	producer         messaging.KafkaProducer
	normalizedTopic  string
	rules            map[string]*models.NormalizationRule
	mu               sync.RWMutex
	stats            *serviceStats
	qualityCache     map[string]*models.QualityScore
}

type serviceStats struct {
	totalProcessed    int64
	last24Hours       int64
	totalQuality      float64
	qualityCount      int64
	errors            int64
	entitiesExtracted int64
	mu                sync.RWMutex
}

func NewNormalizationService(consumer messaging.KafkaConsumer, producer messaging.KafkaProducer, normalizedTopic string) NormalizationService {
	return &normalizationService{
		consumer:        consumer,
		producer:        producer,
		normalizedTopic: normalizedTopic,
		rules:           make(map[string]*models.NormalizationRule),
		stats:           &serviceStats{},
		qualityCache:    make(map[string]*models.QualityScore),
	}
}

func (s *normalizationService) StartConsuming(ctx context.Context) error {
	// Start consuming from Kafka
	return s.consumer.Consume(ctx, func(message []byte) error {
		normalized, err := s.ProcessData(message)
		if err != nil {
			s.stats.mu.Lock()
			s.stats.errors++
			s.stats.mu.Unlock()
			return fmt.Errorf("failed to process data: %w", err)
		}

		// Publish normalized data
		normalizedJSON, err := json.Marshal(normalized)
		if err != nil {
			return err
		}

		if err := s.producer.Publish(s.normalizedTopic, normalized.ID, normalizedJSON); err != nil {
			return err
		}

		// Update stats
		s.stats.mu.Lock()
		s.stats.totalProcessed++
		s.stats.last24Hours++
		s.stats.totalQuality += normalized.Quality.Overall
		s.stats.qualityCount++
		s.stats.entitiesExtracted += int64(len(normalized.Entities))
		s.stats.mu.Unlock()

		// Cache quality score
		s.qualityCache[normalized.OriginalID] = &normalized.Quality

		return nil
	})
}

func (s *normalizationService) StopConsuming() {
	s.consumer.Close()
}

func (s *normalizationService) ProcessData(rawData []byte) (*models.NormalizedData, error) {
	startTime := time.Now()

	// Parse raw data
	var raw map[string]interface{}
	if err := json.Unmarshal(rawData, &raw); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	// Extract metadata
	originalID := ""
	if id, ok := raw["id"].(string); ok {
		originalID = id
	}
	sourceID := ""
	if sid, ok := raw["source_id"].(string); ok {
		sourceID = sid
	}

	// Apply normalization rules
	normalized := make(map[string]interface{})
	transformations := []models.Transformation{}

	s.mu.RLock()
	rules := make([]*models.NormalizationRule, 0, len(s.rules))
	for _, rule := range s.rules {
		if rule.Active {
			rules = append(rules, rule)
		}
	}
	s.mu.RUnlock()

	// Sort by priority
	for i := 0; i < len(rules)-1; i++ {
		for j := i + 1; j < len(rules); j++ {
			if rules[i].Priority < rules[j].Priority {
				rules[i], rules[j] = rules[j], rules[i]
			}
		}
	}

	// Apply rules
	for _, rule := range rules {
		if value, exists := raw[rule.Field]; exists {
			normalizedValue, transformation := s.applyRule(rule, value)
			if transformation != nil {
				normalized[rule.Field] = normalizedValue
				transformations = append(transformations, *transformation)
			} else {
				normalized[rule.Field] = value
			}
		}
	}

	// Copy remaining fields
	for k, v := range raw {
		if _, exists := normalized[k]; !exists {
			normalized[k] = v
		}
	}

	// Extract entities (basic)
	entities := s.extractEntities(normalized)

	// Calculate quality score
	quality := s.calculateQuality(normalized, raw)

	// Create normalized data
	result := &models.NormalizedData{
		ID:           uuid.New().String(),
		OriginalID:   originalID,
		SourceID:     sourceID,
		Data:         normalized,
		Quality:      quality,
		Entities:     entities,
		NormalizedAt: time.Now(),
		Metadata: models.NormalizationMetadata{
			RulesApplied:    s.getRuleIDs(rules),
			Transformations: transformations,
			ProcessingTime:  time.Since(startTime),
			Version:         "v1",
		},
	}

	return result, nil
}

func (s *normalizationService) applyRule(rule *models.NormalizationRule, value interface{}) (interface{}, *models.Transformation) {
	switch rule.Type {
	case models.RuleTypeDate:
		return s.normalizeDate(value, rule)
	case models.RuleTypeCurrency:
		return s.normalizeCurrency(value, rule)
	case models.RuleTypeLocation:
		return s.normalizeLocation(value, rule)
	default:
		return value, nil
	}
}

func (s *normalizationService) normalizeDate(value interface{}, rule *models.NormalizationRule) (interface{}, *models.Transformation) {
	// Basic date normalization - convert to RFC3339
	// TODO: Implement proper date parsing and normalization
	return value, nil
}

func (s *normalizationService) normalizeCurrency(value interface{}, rule *models.NormalizationRule) (interface{}, *models.Transformation) {
	// Basic currency normalization
	// TODO: Implement currency conversion and normalization
	return value, nil
}

func (s *normalizationService) normalizeLocation(value interface{}, rule *models.NormalizationRule) (interface{}, *models.Transformation) {
	// Basic location normalization
	// TODO: Implement location normalization (geocoding, etc.)
	return value, nil
}

func (s *normalizationService) extractEntities(data map[string]interface{}) []models.Entity {
	// Basic entity extraction
	// TODO: Implement proper NLP entity extraction
	entities := []models.Entity{}

	// Simple extraction from text fields
	for key, value := range data {
		if str, ok := value.(string); ok && len(str) > 10 {
			// Basic heuristic: if field name suggests entity type
			if key == "organization" || key == "company" {
				entities = append(entities, models.Entity{
					Type:      "organization",
					Value:     str,
					Confidence: 0.7,
				})
			}
		}
	}

	return entities
}

func (s *normalizationService) calculateQuality(normalized, original map[string]interface{}) models.QualityScore {
	// Basic quality scoring
	completeness := s.calculateCompleteness(normalized, original)
	accuracy := 0.9 // TODO: Implement accuracy calculation
	consistency := 0.85 // TODO: Implement consistency check
	timeliness := 1.0 // TODO: Calculate based on data age

	overall := (completeness + accuracy + consistency + timeliness) / 4.0

	return models.QualityScore{
		Overall:      overall,
		Completeness: completeness,
		Accuracy:     accuracy,
		Consistency:   consistency,
		Timeliness:    timeliness,
		Details:      make(map[string]float64),
	}
}

func (s *normalizationService) calculateCompleteness(normalized, original map[string]interface{}) float64 {
	if len(original) == 0 {
		return 0.0
	}
	nonEmpty := 0
	for _, v := range normalized {
		if v != nil && v != "" {
			nonEmpty++
		}
	}
	return float64(nonEmpty) / float64(len(original))
}

func (s *normalizationService) getRuleIDs(rules []*models.NormalizationRule) []string {
	ids := make([]string, len(rules))
	for i, rule := range rules {
		ids[i] = rule.ID
	}
	return ids
}

func (s *normalizationService) CreateRule(rule *models.NormalizationRule) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	rule.ID = uuid.New().String()
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = time.Now()
	s.rules[rule.ID] = rule
	return nil
}

func (s *normalizationService) GetRule(id string) (*models.NormalizationRule, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rule, exists := s.rules[id]
	if !exists {
		return nil, fmt.Errorf("rule not found")
	}
	return rule, nil
}

func (s *normalizationService) ListRules() ([]*models.NormalizationRule, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rules := make([]*models.NormalizationRule, 0, len(s.rules))
	for _, rule := range s.rules {
		rules = append(rules, rule)
	}
	return rules, nil
}

func (s *normalizationService) UpdateRule(id string, rule *models.NormalizationRule) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.rules[id]; !exists {
		return fmt.Errorf("rule not found")
	}

	rule.ID = id
	rule.UpdatedAt = time.Now()
	s.rules[id] = rule
	return nil
}

func (s *normalizationService) DeleteRule(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.rules[id]; !exists {
		return fmt.Errorf("rule not found")
	}

	delete(s.rules, id)
	return nil
}

func (s *normalizationService) GetQuality(dataID string) (*models.QualityScore, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	quality, exists := s.qualityCache[dataID]
	if !exists {
		return nil, fmt.Errorf("quality data not found")
	}
	return quality, nil
}

func (s *normalizationService) GetStats() (*models.NormalizationStats, error) {
	s.stats.mu.RLock()
	defer s.stats.mu.RUnlock()

	s.mu.RLock()
	activeRules := 0
	for _, rule := range s.rules {
		if rule.Active {
			activeRules++
		}
	}
	s.mu.RUnlock()

	avgQuality := 0.0
	if s.stats.qualityCount > 0 {
		avgQuality = s.stats.totalQuality / float64(s.stats.qualityCount)
	}

	errorRate := 0.0
	total := s.stats.totalProcessed + s.stats.errors
	if total > 0 {
		errorRate = float64(s.stats.errors) / float64(total)
	}

	return &models.NormalizationStats{
		TotalProcessed:    s.stats.totalProcessed,
		Last24Hours:       s.stats.last24Hours,
		AverageQuality:    avgQuality,
		ErrorRate:         errorRate,
		ActiveRules:       activeRules,
		EntitiesExtracted: s.stats.entitiesExtracted,
	}, nil
}
