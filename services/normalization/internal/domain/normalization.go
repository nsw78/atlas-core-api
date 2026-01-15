package models

import (
	"time"
)

type NormalizationRule struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Field       string                 `json:"field"`
	Type        RuleType               `json:"type"`
	Config      map[string]interface{} `json:"config"`
	Priority    int                    `json:"priority"`
	Active      bool                   `json:"active"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

type RuleType string

const (
	RuleTypeDate     RuleType = "date"
	RuleTypeCurrency RuleType = "currency"
	RuleTypeLocation RuleType = "location"
	RuleTypeEntity   RuleType = "entity"
	RuleTypeFormat   RuleType = "format"
)

type NormalizedData struct {
	ID            string                 `json:"id"`
	OriginalID    string                 `json:"original_id"`
	SourceID      string                 `json:"source_id"`
	Data          map[string]interface{} `json:"data"`
	Quality       QualityScore           `json:"quality"`
	Entities      []Entity               `json:"entities"`
	NormalizedAt  time.Time              `json:"normalized_at"`
	Metadata      NormalizationMetadata  `json:"metadata"`
}

type QualityScore struct {
	Overall      float64            `json:"overall"`      // 0-1
	Completeness float64            `json:"completeness"` // 0-1
	Accuracy     float64            `json:"accuracy"`     // 0-1
	Consistency  float64            `json:"consistency"`  // 0-1
	Timeliness   float64            `json:"timeliness"`   // 0-1
	Details      map[string]float64 `json:"details"`
}

type Entity struct {
	Type      string  `json:"type"`      // person, organization, location, etc.
	Value     string  `json:"value"`
	Confidence float64 `json:"confidence"` // 0-1
	StartPos  int     `json:"start_pos"`
	EndPos    int     `json:"end_pos"`
}

type NormalizationMetadata struct {
	RulesApplied []string          `json:"rules_applied"`
	Transformations []Transformation `json:"transformations"`
	ProcessingTime time.Duration   `json:"processing_time"`
	Version       string            `json:"version"`
}

type Transformation struct {
	Field       string `json:"field"`
	From        string `json:"from"`
	To          string `json:"to"`
	RuleID      string `json:"rule_id"`
	Description string `json:"description"`
}

type NormalizationStats struct {
	TotalProcessed    int64   `json:"total_processed"`
	Last24Hours       int64   `json:"last_24_hours"`
	AverageQuality    float64 `json:"average_quality"`
	ErrorRate         float64 `json:"error_rate"`
	ActiveRules       int     `json:"active_rules"`
	EntitiesExtracted int64   `json:"entities_extracted"`
}
