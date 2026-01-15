package models

import "time"

type RiskAlert struct {
	ID          string    `json:"id"`
	EntityID    string    `json:"entity_id"`
	Dimension   string    `json:"dimension"`
	Threshold   float64   `json:"threshold"`
	Condition   string    `json:"condition"` // "above", "below", "equals"
	Active      bool      `json:"active"`
	Triggered   bool      `json:"triggered"`
	LastTrigger *time.Time `json:"last_trigger"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type AlertConfiguration struct {
	EntityID  string  `json:"entity_id" binding:"required"`
	Dimension string  `json:"dimension" binding:"required"`
	Threshold float64 `json:"threshold" binding:"required"`
	Condition string  `json:"condition" binding:"required"` // "above", "below"
}
