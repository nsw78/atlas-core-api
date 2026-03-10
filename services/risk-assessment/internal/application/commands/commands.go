package commands

// AssessRiskCommand initiates a risk assessment for an entity
type AssessRiskCommand struct {
	EntityID       string   `json:"entity_id"`
	EntityType     string   `json:"entity_type"`
	Dimensions     []string `json:"dimensions"`
	TimeHorizon    string   `json:"time_horizon"`
	IncludeFactors bool     `json:"include_factors"`
	IncludeTrends  bool     `json:"include_trends"`
	RequestedBy    string   `json:"requested_by"`
}

// ConfigureAlertCommand creates or updates a risk alert configuration
type ConfigureAlertCommand struct {
	EntityID  string  `json:"entity_id"`
	Dimension string  `json:"dimension"`
	Threshold float64 `json:"threshold"`
	Condition string  `json:"condition"` // "above", "below", "equals"
	CreatedBy string  `json:"created_by"`
}

// ResolveAlertCommand resolves an active alert
type ResolveAlertCommand struct {
	AlertID    string `json:"alert_id"`
	ResolvedBy string `json:"resolved_by"`
	Resolution string `json:"resolution"`
}

// DeleteAlertCommand removes an alert configuration
type DeleteAlertCommand struct {
	AlertID string `json:"alert_id"`
}
