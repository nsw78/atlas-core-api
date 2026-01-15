package service

import (
	"math"
	"time"

	"github.com/google/uuid"
	models "atlas-core-api/services/risk-assessment/internal/domain"
	"atlas-core-api/services/risk-assessment/internal/infrastructure/repository"
)

type RiskAssessmentService struct {
	repo repository.RiskRepository
}

func NewRiskAssessmentService(repo repository.RiskRepository) *RiskAssessmentService {
	return &RiskAssessmentService{
		repo: repo,
	}
}

func (s *RiskAssessmentService) AssessRisk(req *models.AssessRiskRequest) (*models.RiskAssessment, error) {
	// Determine which dimensions to assess
	dimensionsToAssess := req.Dimensions
	if len(dimensionsToAssess) == 0 {
		// Default: assess all dimensions
		dimensionsToAssess = []string{
			models.DimensionOperational,
			models.DimensionFinancial,
			models.DimensionReputational,
			models.DimensionGeopolitical,
			models.DimensionCompliance,
		}
	}

	// Calculate risk scores for each dimension
	dimensions := make(map[string]models.RiskDimension)
	var overallScore float64
	var totalWeight float64

	for _, dimName := range dimensionsToAssess {
		dimension := s.calculateDimensionRisk(req.EntityID, dimName)
		dimensions[dimName] = dimension
		
		// Weighted average for overall score
		weight := dimension.Weight
		if weight == 0 {
			weight = 0.2 // Default equal weight
		}
		overallScore += dimension.Score * weight
		totalWeight += weight
	}

	if totalWeight > 0 {
		overallScore = overallScore / totalWeight
	}

	// Calculate confidence based on data availability
	confidence := s.calculateConfidence(req.EntityID, dimensions)

	// Get risk factors if requested
	var factors []models.RiskFactor
	if req.IncludeFactors {
		factors = s.getRiskFactors(req.EntityID, dimensions)
	}

	// Create assessment
	assessment := &models.RiskAssessment{
		ID:           uuid.New().String(),
		EntityID:     req.EntityID,
		EntityType:   req.EntityType,
		OverallScore: math.Round(overallScore*100) / 100,
		Confidence:   math.Round(confidence*100) / 100,
		Dimensions:   dimensions,
		Factors:      factors,
		Timestamp:    time.Now(),
		ValidUntil:   time.Now().Add(24 * time.Hour),
	}

	// Store assessment
	if err := s.repo.Create(assessment); err != nil {
		return nil, err
	}

	// Check alerts
	go s.checkAlerts(assessment)

	return assessment, nil
}

func (s *RiskAssessmentService) calculateDimensionRisk(entityID, dimension string) models.RiskDimension {
	// TODO: Integrate with actual data sources and ML models
	// For Phase 1, use rule-based calculation with mock data
	
	baseScore := 0.5 // Base risk score
	
	// Adjust based on dimension type
	switch dimension {
	case models.DimensionOperational:
		baseScore = 0.45
	case models.DimensionFinancial:
		baseScore = 0.55
	case models.DimensionReputational:
		baseScore = 0.40
	case models.DimensionGeopolitical:
		baseScore = 0.60
	case models.DimensionCompliance:
		baseScore = 0.35
	}

	// Add some variance based on entity ID (for demo purposes)
	// In production, this would use actual data
	variance := float64(len(entityID)%10) / 100.0
	score := math.Min(1.0, math.Max(0.0, baseScore+variance))

	// Determine trend (mock)
	trend := "stable"
	if score > 0.7 {
		trend = "increasing"
	} else if score < 0.3 {
		trend = "decreasing"
	}

	// Key factors (mock)
	keyFactors := []string{
		"Market volatility",
		"Regulatory changes",
		"Economic indicators",
	}

	return models.RiskDimension{
		Name:       dimension,
		Score:      math.Round(score*100) / 100,
		Trend:      trend,
		KeyFactors: keyFactors,
		Weight:     0.2, // Equal weight for all dimensions
	}
}

func (s *RiskAssessmentService) calculateConfidence(entityID string, dimensions map[string]models.RiskDimension) float64 {
	// Confidence based on number of dimensions assessed and data quality
	// TODO: Integrate with actual data quality metrics
	dimensionCount := float64(len(dimensions))
	if dimensionCount == 0 {
		return 0.0
	}
	
	// Base confidence increases with more dimensions
	baseConfidence := 0.5 + (dimensionCount * 0.1)
	return math.Min(1.0, baseConfidence)
}

func (s *RiskAssessmentService) getRiskFactors(entityID string, dimensions map[string]models.RiskDimension) []models.RiskFactor {
	// TODO: Extract actual risk factors from data sources
	factors := []models.RiskFactor{
		{
			ID:       uuid.New().String(),
			Name:     "Market volatility",
			Impact:   0.15,
			Source:   "news-aggregator",
			SourceID: "article-001",
		},
		{
			ID:       uuid.New().String(),
			Name:     "Regulatory changes",
			Impact:   0.12,
			Source:   "regulatory-feed",
			SourceID: "reg-002",
		},
	}
	return factors
}

func (s *RiskAssessmentService) checkAlerts(assessment *models.RiskAssessment) {
	// Check all active alerts for this entity
	alerts, err := s.repo.ListAlerts(true)
	if err != nil {
		return
	}

	for _, alert := range alerts {
		if alert.EntityID != assessment.EntityID {
			continue
		}

		var shouldTrigger bool
		dimension, exists := assessment.Dimensions[alert.Dimension]
		if !exists {
			continue
		}

		switch alert.Condition {
		case "above":
			shouldTrigger = dimension.Score > alert.Threshold
		case "below":
			shouldTrigger = dimension.Score < alert.Threshold
		case "equals":
			shouldTrigger = math.Abs(dimension.Score-alert.Threshold) < 0.01
		}

		if shouldTrigger && !alert.Triggered {
			// Trigger alert
			now := time.Now()
			alert.Triggered = true
			alert.LastTrigger = &now
			s.repo.UpdateAlert(alert.ID, alert)
			// TODO: Send notification
		}
	}
}

func (s *RiskAssessmentService) GetRiskAssessment(id string) (*models.RiskAssessment, error) {
	return s.repo.GetByID(id)
}

func (s *RiskAssessmentService) GetRiskTrends(entityID, dimension, period string) ([]*models.RiskAssessment, error) {
	return s.repo.GetTrends(entityID, dimension, period)
}

func (s *RiskAssessmentService) GetAssessmentsByEntity(entityID string, limit int) ([]*models.RiskAssessment, error) {
	return s.repo.GetByEntityID(entityID, limit)
}

func (s *RiskAssessmentService) ConfigureAlert(config *models.AlertConfiguration) (*models.RiskAlert, error) {
	alert := &models.RiskAlert{
		ID:        uuid.New().String(),
		EntityID:  config.EntityID,
		Dimension: config.Dimension,
		Threshold: config.Threshold,
		Condition: config.Condition,
		Active:    true,
		Triggered: false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.repo.CreateAlert(alert); err != nil {
		return nil, err
	}

	return alert, nil
}

func (s *RiskAssessmentService) ListAlerts(activeOnly bool) ([]*models.RiskAlert, error) {
	return s.repo.ListAlerts(activeOnly)
}

func (s *RiskAssessmentService) DeleteAlert(id string) error {
	return s.repo.DeleteAlert(id)
}
