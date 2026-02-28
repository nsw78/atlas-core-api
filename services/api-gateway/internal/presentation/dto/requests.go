package dto

import (
	"time"
)

// LoginRequest represents a login request
type LoginRequest struct {
	Username string `json:"username" binding:"required,min=3,max=255"`
	Password string `json:"password" binding:"required,min=8,max=255"`
	MFACode  string `json:"mfa_code,omitempty" binding:"omitempty,len=6"`
}

// RefreshTokenRequest represents a token refresh request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ChangePasswordRequest represents a password change request
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required,min=8"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
	Confirm     string `json:"confirm" binding:"required,eqfield=NewPassword"`
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
	Confirm     string `json:"confirm" binding:"required,eqfield=NewPassword"`
}

// RegisterRequest represents a user registration request
type RegisterRequest struct {
	Username            string `json:"username" binding:"required,min=3,max=255"`
	Email               string `json:"email" binding:"required,email"`
	Password            string `json:"password" binding:"required,min=8"`
	PasswordConfirm      string `json:"password_confirm" binding:"required,eqfield=Password"`
	FirstName           string `json:"first_name" binding:"required,min=1,max=255"`
	LastName            string `json:"last_name" binding:"required,min=1,max=255"`
	AcceptTerms         bool   `json:"accept_terms" binding:"required,eq=true"`
	AcceptPrivacyPolicy bool   `json:"accept_privacy_policy" binding:"required,eq=true"`
}

// UpdateProfileRequest represents a profile update request
type UpdateProfileRequest struct {
	FirstName   string `json:"first_name" binding:"omitempty,min=1,max=255"`
	LastName    string `json:"last_name" binding:"omitempty,min=1,max=255"`
	PhoneNumber string `json:"phone_number" binding:"omitempty,max=20"`
	Bio         string `json:"bio" binding:"omitempty,max=500"`
	Country     string `json:"country" binding:"omitempty,len=2"`
}

// PaginationRequest represents pagination parameters
type PaginationRequest struct {
	Page     int    `form:"page" binding:"omitempty,min=1"`
	PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
	Sort     string `form:"sort" binding:"omitempty"`
	Order    string `form:"order" binding:"omitempty,oneof=asc desc"`
}

// FilterRequest represents filter parameters
type FilterRequest struct {
	StartDate *time.Time `form:"start_date" binding:"omitempty"`
	EndDate   *time.Time `form:"end_date" binding:"omitempty"`
	Status    string     `form:"status" binding:"omitempty"`
	Search    string     `form:"search" binding:"omitempty,max=255"`
}

// EnableMFARequest represents an MFA enablement request
type EnableMFARequest struct {
	Password string `json:"password" binding:"required"`
}

// DisableMFARequest represents an MFA disablement request
type DisableMFARequest struct {
	Password   string `json:"password" binding:"required"`
	MFACode    string `json:"mfa_code" binding:"required,len=6"`
	BackupCode string `json:"backup_code" binding:"required"`
}

// VerifyMFARequest represents MFA verification request
type VerifyMFARequest struct {
	MFACode string `json:"mfa_code" binding:"required,len=6"`
}

// AuditLogRequest represents audit log query parameters
type AuditLogRequest struct {
	UserID    string     `form:"user_id" binding:"omitempty"`
	Action    string     `form:"action" binding:"omitempty"`
	StartDate *time.Time `form:"start_date" binding:"omitempty"`
	EndDate   *time.Time `form:"end_date" binding:"omitempty"`
	Page      int        `form:"page" binding:"omitempty,min=1"`
	PageSize  int        `form:"page_size" binding:"omitempty,min=1,max=100"`
}

// RoleAssignmentRequest represents role assignment
type RoleAssignmentRequest struct {
	RoleID string `json:"role_id" binding:"required"`
}

// PermissionAssignmentRequest represents permission assignment
type PermissionAssignmentRequest struct {
	PermissionID string `json:"permission_id" binding:"required"`
}

// BulkActionRequest represents bulk operations
type BulkActionRequest struct {
	IDs    []string `json:"ids" binding:"required,min=1"`
	Action string   `json:"action" binding:"required"`
}
