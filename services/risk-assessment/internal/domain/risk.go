package models

import "time"

type RiskAssessment struct {
	ID           string                    `json:"id"`
	EntityID     string                    `json:"entity_id"`
	EntityType   string                    `json:"entity_type"`
	OverallScore float64                   `json:"overall_score"`
	Confidence   float64                   `json:"confidence"`
	Dimensions   map[string]RiskDimension  `json:"dimensions"`
	Factors      []RiskFactor              `json:"factors"`
	Timestamp    time.Time                 `json:"timestamp"`
	ValidUntil   time.Time                 `json:"valid_until"`
}

type RiskDimension struct {
	Name       string   `json:"name"`
	Score      float64  `json:"score"`
	Trend      string   `json:"trend"` // "increasing", "decreasing", "stable"
	KeyFactors []string `json:"key_factors"`
	Weight     float64  `json:"weight"` // Weight in overall score calculation
}

const (
	DimensionOperational   = "operational"
	DimensionFinancial      = "financial"
	DimensionReputational   = "reputational"
	DimensionGeopolitical   = "geopolitical"
	DimensionCompliance     = "compliance"
)

type RiskFactor struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Impact   float64 `json:"impact"`
	Source   string  `json:"source"`
	SourceID string  `json:"source_id"`
}

type AssessRiskRequest struct {
	EntityID      string   `json:"entity_id" binding:"required"`
	EntityType    string   `json:"entity_type" binding:"required"`
	Dimensions    []string `json:"dimensions"`
	TimeHorizon   string   `json:"time_horizon"`
	IncludeFactors bool   `json:"include_factors"`
	IncludeTrends  bool   `json:"include_trends"`
}
