package commands

type CreateUserCommand struct {
	Username  string
	Email     string
	Password  string
	FirstName string
	LastName  string
}

type LoginUserCommand struct {
	Username  string
	Password  string
	IPAddress string
	UserAgent string
}

type ChangePasswordCommand struct {
	UserID      string
	OldPassword string
	NewPassword string
}

type DeactivateUserCommand struct {
	UserID string
	Reason string
}

type AssignRoleCommand struct {
	UserID string
	RoleID string
}

type RevokeRoleCommand struct {
	UserID string
	RoleID string
}
