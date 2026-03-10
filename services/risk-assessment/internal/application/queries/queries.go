package queries

// GetRiskAssessmentQuery retrieves a specific assessment
type GetRiskAssessmentQuery struct {
	AssessmentID string
}

// GetRiskTrendsQuery retrieves risk trends over time
type GetRiskTrendsQuery struct {
	EntityID  string
	Dimension string
	Period    string // "7d", "30d", "90d", "1y"
}

// GetEntityAssessmentsQuery retrieves assessments for an entity
type GetEntityAssessmentsQuery struct {
	EntityID string
	Limit    int
}

// GetRiskProfileQuery retrieves executive risk profile
type GetRiskProfileQuery struct {
	EntityID   string
	EntityType string
}

// ListAlertsQuery retrieves alerts with filtering
type ListAlertsQuery struct {
	ActiveOnly bool
	EntityID   string
	Severity   string
}
