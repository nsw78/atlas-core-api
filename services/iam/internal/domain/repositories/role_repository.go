package repositories

import "context"

type Role struct {
	ID          string
	Name        string
	Description string
	Permissions []string
}

type RoleRepository interface {
	FindByID(ctx context.Context, id string) (*Role, error)
	FindByName(ctx context.Context, name string) (*Role, error)
	List(ctx context.Context) ([]*Role, error)
	Create(ctx context.Context, role *Role) error
	AssignToUser(ctx context.Context, userID, roleID string) error
	RevokeFromUser(ctx context.Context, userID, roleID string) error
}
