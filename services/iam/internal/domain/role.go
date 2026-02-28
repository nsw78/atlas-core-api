package models

// Role represents an RBAC role with associated permissions
type Role struct {
	ID          string
	Name        string
	Description string
	Permissions []string
	CreatedAt   string
	UpdatedAt   string
}

// Permission represents a granular permission
type Permission struct {
	ID          string
	Name        string
	Resource    string
	Action      string
	Description string
}

// APIKey represents a service API key
type APIKey struct {
	ID         string
	Name       string
	KeyHash    string
	KeyPrefix  string
	OwnerID    string
	Scopes     []string
	Active     bool
	RateLimit  int
	AllowedIPs []string
	ExpiresAt  string
	CreatedAt  string
}
