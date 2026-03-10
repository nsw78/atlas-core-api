package events

import "time"

type DomainEvent interface {
	EventType() string
	OccurredAt() time.Time
	AggregateID() string
}

type BaseEvent struct {
	ID          string    `json:"event_id"`
	Type        string    `json:"event_type"`
	AggregateId string    `json:"aggregate_id"`
	Timestamp   time.Time `json:"timestamp"`
	Version     int       `json:"version"`
}

func (e BaseEvent) EventType() string     { return e.Type }
func (e BaseEvent) OccurredAt() time.Time { return e.Timestamp }
func (e BaseEvent) AggregateID() string   { return e.AggregateId }

type RiskAssessed struct {
	BaseEvent
	EntityID     string             `json:"entity_id"`
	EntityType   string             `json:"entity_type"`
	OverallScore float64            `json:"overall_score"`
	Confidence   float64            `json:"confidence"`
	Dimensions   map[string]float64 `json:"dimensions"`
}

type AlertTriggered struct {
	BaseEvent
	AlertID   string  `json:"alert_id"`
	EntityID  string  `json:"entity_id"`
	Dimension string  `json:"dimension"`
	Score     float64 `json:"score"`
	Threshold float64 `json:"threshold"`
	Condition string  `json:"condition"`
	Severity  string  `json:"severity"`
}

type AlertResolved struct {
	BaseEvent
	AlertID    string `json:"alert_id"`
	EntityID   string `json:"entity_id"`
	ResolvedBy string `json:"resolved_by"`
}

type RiskThresholdBreached struct {
	BaseEvent
	EntityID  string  `json:"entity_id"`
	Dimension string  `json:"dimension"`
	Score     float64 `json:"score"`
	PrevScore float64 `json:"previous_score"`
	Threshold float64 `json:"threshold"`
}
