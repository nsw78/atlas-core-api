package events

import "time"

// DomainEvent is the base interface for all domain events
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

// User Domain Events

type UserCreated struct {
	BaseEvent
	Username string   `json:"username"`
	Email    string   `json:"email"`
	Roles    []string `json:"roles"`
}

type UserLoggedIn struct {
	BaseEvent
	Username  string `json:"username"`
	IPAddress string `json:"ip_address"`
	UserAgent string `json:"user_agent"`
}

type UserLoggedOut struct {
	BaseEvent
	Username string `json:"username"`
}

type UserRoleAssigned struct {
	BaseEvent
	RoleName string `json:"role_name"`
	RoleID   string `json:"role_id"`
}

type UserRoleRevoked struct {
	BaseEvent
	RoleName string `json:"role_name"`
	RoleID   string `json:"role_id"`
}

type UserDeactivated struct {
	BaseEvent
	Reason string `json:"reason"`
}

type PasswordChanged struct {
	BaseEvent
	Username string `json:"username"`
}

type LoginFailed struct {
	BaseEvent
	Username      string `json:"username"`
	IPAddress     string `json:"ip_address"`
	FailureReason string `json:"failure_reason"`
	AttemptCount  int    `json:"attempt_count"`
}
