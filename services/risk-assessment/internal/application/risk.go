package service

import (
	"math"
	"time"

	"github.com/google/uuid"
	models "atlas-core-api/services/risk-assessment/internal/domain"
	"atlas-core-api/services/risk-assessment/internal/infrastructure"
	"atlas-core-api/services/risk-assessment/internal/infrastructure/repository"
	"context"
)

type RiskAssessmentService struct {
	repo     repository.RiskRepository
	dataProvider infrastructure.ExternalDataProvider
}

func NewRiskAssessmentService(repo repository.RiskRepository, dataProvider infrastructure.ExternalDataProvider) *RiskAssessmentService {
	return &RiskAssessmentService{
		repo:     repo,
		dataProvider: dataProvider,
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
	// Create context with timeout for external API calls
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var score float64
	var trend string
	var keyFactors []string

	switch dimension {
	case models.DimensionOperational:
		score, trend, keyFactors, _ = s.calculateOperationalRisk(ctx, entityID)
	case models.DimensionFinancial:
		score, trend, keyFactors, _ = s.calculateFinancialRisk(ctx, entityID)
	case models.DimensionReputational:
		score, trend, keyFactors, _ = s.calculateReputationalRisk(ctx, entityID)
	case models.DimensionGeopolitical:
		score, trend, keyFactors, _ = s.calculateGeopoliticalRisk(ctx, entityID)
	case models.DimensionCompliance:
		score, trend, keyFactors, _ = s.calculateComplianceRisk(ctx, entityID)
	default:
		// Fallback to mock calculation
		score = 0.5
		trend = "stable"
		keyFactors = []string{"Market volatility", "Regulatory changes", "Economic indicators"}
	}

	return models.RiskDimension{
		Name:       dimension,
		Score:      math.Round(score*100) / 100,
		Trend:      trend,
		KeyFactors: keyFactors,
		Weight:     0.2, // Equal weight for all dimensions
	}
}

func (s *RiskAssessmentService) calculateOperationalRisk(ctx context.Context, entityID string) (float64, string, []string, float64) {
	data, err := s.dataProvider.GetOperationalData(entityID, ctx)
	if err != nil {
		// Fallback to mock data if external API fails
		return 0.45, "stable", []string{"System reliability", "Process efficiency", "Resource availability"}, 0.5
	}

	// Calculate operational risk score based on real data
	cyberRisk := float64(data.CybersecurityIncidents) / 10.0 // Normalize to 0-1
	supplyRisk := data.SupplyChainRisk / 100.0
	downtimeRisk := data.SystemDowntime / 10.0 // 10% downtime = high risk
	efficiencyBonus := (data.OperationalEfficiency - 70) / 30.0 // Efficiency above 70% reduces risk

	score := (cyberRisk*0.3 + supplyRisk*0.25 + downtimeRisk*0.25 - efficiencyBonus*0.2)
	score = math.Max(0.0, math.Min(1.0, score))

	trend := "stable"
	if score > 0.7 {
		trend = "increasing"
	} else if score < 0.3 {
		trend = "decreasing"
	}

	factors := []string{"Cybersecurity incidents", "Supply chain disruptions", "System downtime"}
	if data.CybersecurityIncidents > 3 {
		factors = append(factors, "High cybersecurity risk")
	}
	if data.SystemDowntime > 2.0 {
		factors = append(factors, "Frequent system outages")
	}

	return score, trend, factors, data.DataQuality
}

func (s *RiskAssessmentService) calculateFinancialRisk(ctx context.Context, entityID string) (float64, string, []string, float64) {
	data, err := s.dataProvider.GetFinancialData(entityID, ctx)
	if err != nil {
		// Fallback to mock data
		return 0.55, "stable", []string{"Credit rating", "Debt levels", "Market conditions"}, 0.5
	}

	// Calculate financial risk score
	creditRisk := (800 - data.CreditScore) / 500.0 // Lower credit score = higher risk
	debtRisk := data.DebtToEquity / 2.0 // High debt-to-equity = higher risk
	volatilityRisk := data.MarketVolatility / 100.0
	growthBonus := data.RevenueGrowth // Positive growth reduces risk

	score := (creditRisk*0.3 + debtRisk*0.3 + volatilityRisk*0.2 - growthBonus*0.2)
	score = math.Max(0.0, math.Min(1.0, score))

	trend := "stable"
	if data.RevenueGrowth < -0.1 {
		trend = "increasing"
	} else if data.RevenueGrowth > 0.1 {
		trend = "decreasing"
	}

	factors := []string{"Credit rating", "Debt-to-equity ratio", "Market volatility"}
	if data.CreditScore < 600 {
		factors = append(factors, "Poor credit rating")
	}
	if data.DebtToEquity > 1.5 {
		factors = append(factors, "High leverage")
	}

	return score, trend, factors, data.DataQuality
}

func (s *RiskAssessmentService) calculateReputationalRisk(ctx context.Context, entityID string) (float64, string, []string, float64) {
	data, err := s.dataProvider.GetReputationalData(entityID, ctx)
	if err != nil {
		// Fallback to mock data
		return 0.40, "stable", []string{"Public perception", "Media coverage", "Customer feedback"}, 0.5
	}

	// Calculate reputational risk score
	sentimentRisk := (1.0 - data.SocialMediaSentiment) / 2.0 // Negative sentiment = higher risk
	reviewRisk := (5.0 - data.CustomerReviews) / 5.0 // Lower reviews = higher risk
	coverageRisk := data.NewsCoverage / 100.0 // High negative coverage = higher risk

	score := (sentimentRisk*0.4 + reviewRisk*0.3 + coverageRisk*0.3)
	score = math.Max(0.0, math.Min(1.0, score))

	trend := "stable"
	if data.SocialMediaSentiment < -0.2 {
		trend = "increasing"
	} else if data.SocialMediaSentiment > 0.2 {
		trend = "decreasing"
	}

	factors := []string{"Social media sentiment", "Customer reviews", "Media coverage"}
	if data.SocialMediaSentiment < 0 {
		factors = append(factors, "Negative social media sentiment")
	}
	if data.CustomerReviews < 3.5 {
		factors = append(factors, "Poor customer satisfaction")
	}

	return score, trend, factors, data.DataQuality
}

func (s *RiskAssessmentService) calculateGeopoliticalRisk(ctx context.Context, entityID string) (float64, string, []string, float64) {
	data, err := s.dataProvider.GetGeopoliticalData(entityID, ctx)
	if err != nil {
		// Fallback to mock data
		return 0.60, "stable", []string{"Political stability", "Trade relations", "Regional conflicts"}, 0.5
	}

	// Calculate geopolitical risk score
	countryRisk := data.CountryRisk / 100.0
	stabilityRisk := (10.0 - data.PoliticalStability) / 10.0 // Lower stability = higher risk
	sanctionsRisk := data.SanctionsExposure / 100.0
	conflictRisk := float64(len(data.ConflictZones)) / 5.0 // More conflict zones = higher risk

	score := (countryRisk*0.3 + stabilityRisk*0.25 + sanctionsRisk*0.25 + conflictRisk*0.2)
	score = math.Max(0.0, math.Min(1.0, score))

	trend := "stable"
	if data.PoliticalStability < 5.0 {
		trend = "increasing"
	} else if data.PoliticalStability > 8.0 {
		trend = "decreasing"
	}

	factors := []string{"Country risk rating", "Political stability", "Sanctions exposure"}
	if len(data.ConflictZones) > 0 {
		factors = append(factors, "Regional conflict exposure")
	}
	if data.SanctionsExposure > 30 {
		factors = append(factors, "High sanctions risk")
	}

	return score, trend, factors, data.DataQuality
}

func (s *RiskAssessmentService) calculateComplianceRisk(ctx context.Context, entityID string) (float64, string, []string, float64) {
	data, err := s.dataProvider.GetComplianceData(entityID, ctx)
	if err != nil {
		// Fallback to mock data
		return 0.35, "stable", []string{"Regulatory compliance", "Audit findings", "Legal actions"}, 0.5
	}

	// Calculate compliance risk score
	finesRisk := math.Min(1.0, data.RegulatoryFines / 1000000.0) // Cap at $1M
	complianceRisk := (100.0 - data.ComplianceScore) / 100.0 // Lower compliance score = higher risk
	auditRisk := float64(data.AuditFindings) / 20.0 // More findings = higher risk
	privacyRisk := data.DataPrivacyRisk / 100.0
	legalRisk := float64(data.LegalActions) / 10.0 // More legal actions = higher risk

	score := (finesRisk*0.2 + complianceRisk*0.25 + auditRisk*0.2 + privacyRisk*0.2 + legalRisk*0.15)
	score = math.Max(0.0, math.Min(1.0, score))

	trend := "stable"
	if data.AuditFindings > 5 {
		trend = "increasing"
	} else if data.ComplianceScore > 90 {
		trend = "decreasing"
	}

	factors := []string{"Regulatory fines", "Compliance score", "Audit findings"}
	if data.RegulatoryFines > 100000 {
		factors = append(factors, "Significant regulatory fines")
	}
	if data.AuditFindings > 3 {
		factors = append(factors, "Multiple audit findings")
	}

	return score, trend, factors, data.DataQuality
}

func (s *RiskAssessmentService) calculateConfidence(entityID string, dimensions map[string]models.RiskDimension) float64 {
	// Confidence based on number of dimensions assessed and data quality from external sources
	dimensionCount := float64(len(dimensions))
	if dimensionCount == 0 {
		return 0.0
	}
	
	// Base confidence increases with more dimensions
	baseConfidence := 0.5 + (dimensionCount * 0.1)
	
	// Adjust confidence based on data quality from external sources
	// In a real implementation, we'd track data quality per dimension
	// For now, assume average data quality of 0.75 for external data
	externalDataQuality := 0.75
	
	// Combine base confidence with external data quality
	confidence := baseConfidence * externalDataQuality
	
	return math.Min(1.0, confidence)
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
