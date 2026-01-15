package models

import (
	"time"
)

type AuditEventType string

const (
	EventTypeDataAccess      AuditEventType = "data_access"
	EventTypeDataModification AuditEventType = "data_modification"
	EventTypeUserAction      AuditEventType = "user_action"
	EventTypeSystemEvent     AuditEventType = "system_event"
	EventTypePolicyChange    AuditEventType = "policy_change"
	EventTypeDataDeletion    AuditEventType = "data_deletion"
	EventTypeModelDecision   AuditEventType = "model_decision"
)

type AuditLog struct {
	ID          string                 `json:"id"`
	EventType   AuditEventType         `json:"event_type"`
	UserID      string                 `json:"user_id"`
	EntityID    string                 `json:"entity_id,omitempty"`
	Action      string                 `json:"action"`
	Resource    string                 `json:"resource"`
	ResourceID  string                 `json:"resource_id,omitempty"`
	IPAddress   string                 `json:"ip_address"`
	UserAgent   string                 `json:"user_agent"`
	Metadata    map[string]interface{} `json:"metadata"`
	Timestamp   time.Time               `json:"timestamp"`
	Hash        string                 `json:"hash"` // For immutability verification
}

type ComplianceReport struct {
	PeriodStart    time.Time              `json:"period_start"`
	PeriodEnd      time.Time              `json:"period_end"`
	TotalEvents    int64                  `json:"total_events"`
	EventTypes     map[string]int64       `json:"event_types"`
	Users          []UserActivity         `json:"users"`
	DataAccess     DataAccessSummary      `json:"data_access"`
	Compliance     ComplianceStatus       `json:"compliance"`
	Anomalies      []Anomaly              `json:"anomalies"`
}

type UserActivity struct {
	UserID    string    `json:"user_id"`
	EventCount int64   `json:"event_count"`
	LastActivity time.Time `json:"last_activity"`
}

type DataAccessSummary struct {
	TotalAccesses    int64            `json:"total_accesses"`
	UniqueResources  int64            `json:"unique_resources"`
	AccessByType     map[string]int64 `json:"access_by_type"`
}

type ComplianceStatus struct {
	GDPRCompliant    bool     `json:"gdpr_compliant"`
	LGPDCompliant    bool     `json:"lgpd_compliant"`
	Issues           []string `json:"issues"`
	LastAudit        time.Time `json:"last_audit"`
}

type Anomaly struct {
	Type        string    `json:"type"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"` // low, medium, high, critical
	Timestamp   time.Time `json:"timestamp"`
	EventID     string    `json:"event_id"`
}

type CreateEventRequest struct {
	EventType  AuditEventType         `json:"event_type" binding:"required"`
	UserID     string                 `json:"user_id" binding:"required"`
	EntityID   string                 `json:"entity_id,omitempty"`
	Action     string                 `json:"action" binding:"required"`
	Resource   string                 `json:"resource" binding:"required"`
	ResourceID string                 `json:"resource_id,omitempty"`
	Metadata   map[string]interface{} `json:"metadata"`
}
