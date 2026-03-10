package aggregates

import (
	"time"

	"atlas-core-api/services/iam/internal/domain/events"
	"atlas-core-api/services/iam/internal/domain/valueobjects"

	"github.com/google/uuid"
)

// UserAggregate is the aggregate root for the User bounded context
type UserAggregate struct {
	id           valueobjects.UserID
	username     string
	email        valueobjects.Email
	passwordHash valueobjects.HashedPassword
	firstName    string
	lastName     string
	roles        []string
	permissions  []string
	active       bool
	verified     bool
	mfaEnabled   bool
	lastLoginAt  *time.Time
	createdAt    time.Time
	updatedAt    time.Time

	domainEvents []events.DomainEvent
}

// NewUserAggregate creates a new user aggregate (factory method)
func NewUserAggregate(username string, email valueobjects.Email, password valueobjects.HashedPassword) *UserAggregate {
	id := valueobjects.NewUserID()
	now := time.Now()

	user := &UserAggregate{
		id:           id,
		username:     username,
		email:        email,
		passwordHash: password,
		active:       true,
		verified:     false,
		roles:        []string{"viewer"},
		createdAt:    now,
		updatedAt:    now,
	}

	user.addEvent(events.UserCreated{
		BaseEvent: events.BaseEvent{
			ID:          uuid.New().String(),
			Type:        "atlas.user.created",
			AggregateId: id.String(),
			Timestamp:   now,
			Version:     1,
		},
		Username: username,
		Email:    email.String(),
		Roles:    []string{"viewer"},
	})

	return user
}

// ReconstructUserAggregate reconstructs from persistence (no events emitted)
func ReconstructUserAggregate(
	id, username, email, passwordHash string,
	firstName, lastName string,
	roles, permissions []string,
	active, verified, mfaEnabled bool,
	lastLoginAt *time.Time,
	createdAt, updatedAt time.Time,
) *UserAggregate {
	emailVO, _ := valueobjects.NewEmail(email)
	userID, _ := valueobjects.UserIDFromString(id)

	return &UserAggregate{
		id:           userID,
		username:     username,
		email:        emailVO,
		passwordHash: valueobjects.HashedPasswordFromStore(passwordHash),
		firstName:    firstName,
		lastName:     lastName,
		roles:        roles,
		permissions:  permissions,
		active:       active,
		verified:     verified,
		mfaEnabled:   mfaEnabled,
		lastLoginAt:  lastLoginAt,
		createdAt:    createdAt,
		updatedAt:    updatedAt,
	}
}

func (u *UserAggregate) VerifyPassword(plaintext string) bool {
	return u.passwordHash.Verify(plaintext)
}

func (u *UserAggregate) RecordLogin(ipAddress, userAgent string) {
	now := time.Now()
	u.lastLoginAt = &now
	u.updatedAt = now

	u.addEvent(events.UserLoggedIn{
		BaseEvent: events.BaseEvent{
			ID:          uuid.New().String(),
			Type:        "atlas.user.logged_in",
			AggregateId: u.id.String(),
			Timestamp:   now,
			Version:     1,
		},
		Username:  u.username,
		IPAddress: ipAddress,
		UserAgent: userAgent,
	})
}

func (u *UserAggregate) AssignRole(roleName, roleID string) {
	for _, r := range u.roles {
		if r == roleName {
			return
		}
	}
	u.roles = append(u.roles, roleName)
	u.updatedAt = time.Now()

	u.addEvent(events.UserRoleAssigned{
		BaseEvent: events.BaseEvent{
			ID:          uuid.New().String(),
			Type:        "atlas.user.role_assigned",
			AggregateId: u.id.String(),
			Timestamp:   u.updatedAt,
			Version:     1,
		},
		RoleName: roleName,
		RoleID:   roleID,
	})
}

func (u *UserAggregate) RevokeRole(roleName, roleID string) {
	filtered := make([]string, 0, len(u.roles))
	for _, r := range u.roles {
		if r != roleName {
			filtered = append(filtered, r)
		}
	}
	u.roles = filtered
	u.updatedAt = time.Now()

	u.addEvent(events.UserRoleRevoked{
		BaseEvent: events.BaseEvent{
			ID:          uuid.New().String(),
			Type:        "atlas.user.role_revoked",
			AggregateId: u.id.String(),
			Timestamp:   u.updatedAt,
			Version:     1,
		},
		RoleName: roleName,
		RoleID:   roleID,
	})
}

func (u *UserAggregate) Deactivate(reason string) {
	u.active = false
	u.updatedAt = time.Now()

	u.addEvent(events.UserDeactivated{
		BaseEvent: events.BaseEvent{
			ID:          uuid.New().String(),
			Type:        "atlas.user.deactivated",
			AggregateId: u.id.String(),
			Timestamp:   u.updatedAt,
			Version:     1,
		},
		Reason: reason,
	})
}

func (u *UserAggregate) HasRole(role string) bool {
	for _, r := range u.roles {
		if r == role {
			return true
		}
	}
	return false
}

func (u *UserAggregate) HasPermission(permission string) bool {
	for _, p := range u.permissions {
		if p == permission || p == "*" || p == "admin:all" {
			return true
		}
	}
	return false
}

func (u *UserAggregate) IsAdmin() bool  { return u.HasRole("admin") }
func (u *UserAggregate) IsActive() bool { return u.active }

// Getters
func (u *UserAggregate) ID() valueobjects.UserID  { return u.id }
func (u *UserAggregate) Username() string          { return u.username }
func (u *UserAggregate) Email() valueobjects.Email { return u.email }
func (u *UserAggregate) PasswordHash() string      { return u.passwordHash.String() }
func (u *UserAggregate) FirstName() string         { return u.firstName }
func (u *UserAggregate) LastName() string          { return u.lastName }
func (u *UserAggregate) Roles() []string           { return u.roles }
func (u *UserAggregate) Permissions() []string     { return u.permissions }
func (u *UserAggregate) Active() bool              { return u.active }
func (u *UserAggregate) Verified() bool            { return u.verified }
func (u *UserAggregate) MFAEnabled() bool          { return u.mfaEnabled }
func (u *UserAggregate) LastLoginAt() *time.Time   { return u.lastLoginAt }
func (u *UserAggregate) CreatedAt() time.Time      { return u.createdAt }
func (u *UserAggregate) UpdatedAt() time.Time      { return u.updatedAt }

func (u *UserAggregate) FullName() string {
	if u.firstName == "" && u.lastName == "" {
		return u.username
	}
	return u.firstName + " " + u.lastName
}

func (u *UserAggregate) addEvent(event events.DomainEvent) {
	u.domainEvents = append(u.domainEvents, event)
}

func (u *UserAggregate) DomainEvents() []events.DomainEvent {
	return u.domainEvents
}

func (u *UserAggregate) ClearEvents() {
	u.domainEvents = nil
}
