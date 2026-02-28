package dto

import (
	"time"
)

// SuccessResponse represents a generic success response
type SuccessResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	TraceID string      `json:"trace_id,omitempty"`
}

// PaginatedResponse represents a paginated response
type PaginatedResponse struct {
	Code       int         `json:"code"`
	Message    string      `json:"message"`
	Data       interface{} `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
	TraceID    string      `json:"trace_id,omitempty"`
}

// PaginationMeta contains pagination metadata
type PaginationMeta struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
	HasNext    bool `json:"has_next"`
	HasPrev    bool `json:"has_prev"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	User         UserResponse `json:"user"`
}

// RefreshTokenResponse represents a token refresh response
type RefreshTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// UserResponse represents a user in the response
type UserResponse struct {
	ID              string    `json:"id"`
	Username        string    `json:"username"`
	Email           string    `json:"email"`
	FirstName       string    `json:"first_name"`
	LastName        string    `json:"last_name"`
	PhoneNumber     string    `json:"phone_number,omitempty"`
	Bio             string    `json:"bio,omitempty"`
	Country         string    `json:"country,omitempty"`
	Avatar          string    `json:"avatar,omitempty"`
	Status          string    `json:"status"`
	Roles           []RoleResponse `json:"roles"`
	Permissions     []PermissionResponse `json:"permissions"`
	MFAEnabled      bool      `json:"mfa_enabled"`
	LastLogin       *time.Time `json:"last_login,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// RoleResponse represents a role in response
type RoleResponse struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

// PermissionResponse represents a permission in response
type PermissionResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Resource    string `json:"resource"`
	Action      string `json:"action"`
}

// HealthCheckResponse represents a health check response
type HealthCheckResponse struct {
	Status    string `json:"status"`
	Version   string `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	Services  map[string]ServiceHealth `json:"services"`
	Uptime    int64  `json:"uptime_seconds"`
}

// ServiceHealth represents the health of a service
type ServiceHealth struct {
	Status   string `json:"status"`
	Latency  int    `json:"latency_ms"`
	Message  string `json:"message,omitempty"`
	LastCheck time.Time `json:"last_check"`
}

// ProfileResponse represents a user profile
type ProfileResponse struct {
	User     UserResponse `json:"user"`
	Stats    UserStats    `json:"stats"`
	Settings UserSettings `json:"settings"`
}

// UserStats represents user statistics
type UserStats struct {
	LoginCount        int       `json:"login_count"`
	LastLogin         *time.Time `json:"last_login"`
	APICallsToday     int       `json:"api_calls_today"`
	APICallsThisMonth int       `json:"api_calls_this_month"`
	CreatedResources  int       `json:"created_resources"`
}

// UserSettings represents user settings
type UserSettings struct {
	Timezone      string `json:"timezone"`
	Language      string `json:"language"`
	Theme         string `json:"theme"`
	EmailNotifications bool `json:"email_notifications"`
	TwoFactorAuth bool   `json:"two_factor_auth"`
	SessionTimeout int    `json:"session_timeout_minutes"`
}

// AuditLogResponse represents an audit log entry
type AuditLogResponse struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Action    string    `json:"action"`
	Resource  string    `json:"resource"`
	Details   map[string]interface{} `json:"details"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// MFASetupResponse represents MFA setup response
type MFASetupResponse struct {
	QRCode      string   `json:"qr_code"`
	BackupCodes []string `json:"backup_codes"`
	Secret      string   `json:"secret"`
}

// SessionResponse represents a session
type SessionResponse struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
	LastActivity time.Time `json:"last_activity"`
	ExpiresAt time.Time `json:"expires_at"`
}

// BatchOperationResponse represents batch operation result
type BatchOperationResponse struct {
	Total      int       `json:"total"`
	Successful int       `json:"successful"`
	Failed     int       `json:"failed"`
	Errors     []BatchError `json:"errors,omitempty"`
}

// BatchError represents an error in batch operation
type BatchError struct {
	ID      string `json:"id"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

// VersionInfo represents API version information
type VersionInfo struct {
	Version    string `json:"version"`
	BuildDate  string `json:"build_date"`
	GitCommit  string `json:"git_commit"`
	Environment string `json:"environment"`
}
