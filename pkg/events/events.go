package events

import "time"

// EventEnvelope is the standard envelope for all Kafka messages
type EventEnvelope struct {
	EventID     string      `json:"event_id"`
	EventType   string      `json:"event_type"`
	AggregateID string      `json:"aggregate_id"`
	Timestamp   time.Time   `json:"timestamp"`
	Version     int         `json:"version"`
	Source      string      `json:"source"`
	Payload     interface{} `json:"payload"`
}

// Topic constants for Kafka
const (
	// IAM Topics
	TopicUserCreated      = "atlas.user.created"
	TopicUserLoggedIn     = "atlas.user.logged_in"
	TopicUserLoginFailed  = "atlas.user.login_failed"
	TopicUserRoleAssigned = "atlas.user.role_assigned"
	TopicUserRoleRevoked  = "atlas.user.role_revoked"
	TopicUserDeactivated  = "atlas.user.deactivated"
	TopicPasswordChanged  = "atlas.user.password_changed"

	// Risk Assessment Topics
	TopicRiskAssessed      = "atlas.risk.assessed"
	TopicAlertTriggered    = "atlas.alert.triggered"
	TopicAlertResolved     = "atlas.alert.resolved"
	TopicThresholdBreached = "atlas.risk.threshold_breached"

	// Simulation Topics
	TopicSimulationCompleted = "atlas.simulation.completed"

	// OSINT Topics
	TopicOSINTCollected = "atlas.osint.collected"

	// NLP Topics
	TopicNLPAnalyzed = "atlas.nlp.analyzed"

	// Graph Topics
	TopicGraphUpdated = "atlas.graph.updated"

	// Compliance Topics
	TopicComplianceViolation = "atlas.compliance.violation"

	// Ingestion Topics
	TopicIngestionCompleted = "atlas.ingestion.completed"
)
