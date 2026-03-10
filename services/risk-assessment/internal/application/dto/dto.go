package dto

import "time"

type RiskAssessmentDTO struct {
	ID           string                      `json:"id"`
	EntityID     string                      `json:"entity_id"`
	EntityType   string                      `json:"entity_type"`
	OverallScore float64                     `json:"overall_score"`
	Confidence   float64                     `json:"confidence"`
	RiskLevel    string                      `json:"risk_level"`
	Dimensions   map[string]RiskDimensionDTO `json:"dimensions"`
	Factors      []RiskFactorDTO             `json:"factors,omitempty"`
	Timestamp    time.Time                   `json:"timestamp"`
	ValidUntil   time.Time                   `json:"valid_until"`
}

type RiskDimensionDTO struct {
	Name       string   `json:"name"`
	Score      float64  `json:"score"`
	Level      string   `json:"level"`
	Trend      string   `json:"trend"`
	KeyFactors []string `json:"key_factors"`
	Weight     float64  `json:"weight"`
}

type RiskFactorDTO struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Impact   float64 `json:"impact"`
	Source   string  `json:"source"`
	SourceID string  `json:"source_id"`
}

type RiskTrendsDTO struct {
	EntityID   string             `json:"entity_id"`
	Dimension  string             `json:"dimension"`
	Period     string             `json:"period"`
	DataPoints []RiskDataPointDTO `json:"data_points"`
	TrendLine  string             `json:"trend_line"`
	ChangeRate float64            `json:"change_rate"`
}

type RiskDataPointDTO struct {
	Score     float64   `json:"score"`
	Timestamp time.Time `json:"timestamp"`
}

type RiskAlertDTO struct {
	ID          string     `json:"id"`
	EntityID    string     `json:"entity_id"`
	Dimension   string     `json:"dimension"`
	Threshold   float64    `json:"threshold"`
	Condition   string     `json:"condition"`
	Active      bool       `json:"active"`
	Triggered   bool       `json:"triggered"`
	LastTrigger *time.Time `json:"last_trigger,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type RiskProfileDTO struct {
	EntityID       string                      `json:"entity_id"`
	EntityType     string                      `json:"entity_type"`
	OverallScore   float64                     `json:"overall_score"`
	RiskLevel      string                      `json:"risk_level"`
	Dimensions     map[string]RiskDimensionDTO `json:"dimensions"`
	ActiveAlerts   int                         `json:"active_alerts"`
	LastAssessment time.Time                   `json:"last_assessment"`
	TrendSummary   string                      `json:"trend_summary"`
}

// RiskLevel returns a human-readable risk level from a score
func RiskLevel(score float64) string {
	switch {
	case score >= 0.8:
		return "critical"
	case score >= 0.6:
		return "high"
	case score >= 0.4:
		return "medium"
	default:
		return "low"
	}
}
