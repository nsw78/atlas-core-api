package repository

import (
	models "atlas-core-api/services/iam/internal/domain"
)

type RoleRepository interface {
	GetByID(id string) (*models.Role, error)
	GetByName(name string) (*models.Role, error)
	List() ([]*models.Role, error)
	Create(role *models.Role) error
}

type roleRepository struct {
	// TODO: Add database connection
}

func NewRoleRepository(/* db *sql.DB */) RoleRepository {
	return &roleRepository{}
}

func (r *roleRepository) GetByID(id string) (*models.Role, error) {
	// TODO: Implement
	return nil, nil
}

func (r *roleRepository) GetByName(name string) (*models.Role, error) {
	// TODO: Implement
	return nil, nil
}

func (r *roleRepository) List() ([]*models.Role, error) {
	// TODO: Implement
	return []*models.Role{}, nil
}

func (r *roleRepository) Create(role *models.Role) error {
	// TODO: Implement
	return nil
}
