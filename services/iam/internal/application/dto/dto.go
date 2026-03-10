package dto

import (
	"time"

	"atlas-core-api/services/iam/internal/domain/aggregates"
)

// UserDTO is the data transfer object for user information
type UserDTO struct {
	ID          string     `json:"id"`
	Username    string     `json:"username"`
	Email       string     `json:"email"`
	FirstName   string     `json:"first_name"`
	LastName    string     `json:"last_name"`
	FullName    string     `json:"full_name"`
	Roles       []string   `json:"roles"`
	Permissions []string   `json:"permissions"`
	Active      bool       `json:"active"`
	Verified    bool       `json:"verified"`
	MFAEnabled  bool       `json:"mfa_enabled"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// AuthTokensDTO is the data transfer object for authentication tokens
type AuthTokensDTO struct {
	AccessToken  string  `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
	TokenType    string  `json:"token_type"`
	ExpiresIn    int64   `json:"expires_in"`
	User         UserDTO `json:"user"`
}

// ListUsersResultDTO is the data transfer object for paginated user lists
type ListUsersResultDTO struct {
	Users      []UserDTO `json:"users"`
	Total      int       `json:"total"`
	Page       int       `json:"page"`
	PageSize   int       `json:"page_size"`
	TotalPages int       `json:"total_pages"`
}

// UserFromAggregate maps a UserAggregate to a UserDTO
func UserFromAggregate(u *aggregates.UserAggregate) UserDTO {
	return UserDTO{
		ID:          u.ID().String(),
		Username:    u.Username(),
		Email:       u.Email().String(),
		FirstName:   u.FirstName(),
		LastName:    u.LastName(),
		FullName:    u.FullName(),
		Roles:       u.Roles(),
		Permissions: u.Permissions(),
		Active:      u.Active(),
		Verified:    u.Verified(),
		MFAEnabled:  u.MFAEnabled(),
		LastLoginAt: u.LastLoginAt(),
		CreatedAt:   u.CreatedAt(),
		UpdatedAt:   u.UpdatedAt(),
	}
}
