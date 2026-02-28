package repository

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/lib/pq"
	models "atlas-core-api/services/iam/internal/domain"
)

var (
	ErrRoleNotFound      = errors.New("role not found")
	ErrRoleAlreadyExists = errors.New("role already exists")
)

type RoleRepository interface {
	GetByID(id string) (*models.Role, error)
	GetByName(name string) (*models.Role, error)
	List() ([]*models.Role, error)
	Create(role *models.Role) error
	AssignToUser(userID, roleID string) error
	RemoveFromUser(userID, roleID string) error
}

type roleRepository struct {
	db *sql.DB
}

func NewRoleRepository(dbs ...*sql.DB) RoleRepository {
	r := &roleRepository{}
	if len(dbs) > 0 {
		r.db = dbs[0]
	}
	return r
}

func (r *roleRepository) GetByID(id string) (*models.Role, error) {
	if r.db == nil {
		return nil, ErrRoleNotFound
	}

	query := `
		SELECT r.id, r.name, r.description, r.created_at::text, r.updated_at::text,
		       COALESCE(array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), '{}') as permissions
		FROM roles r
		LEFT JOIN role_permissions rp ON r.id = rp.role_id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		WHERE r.id = $1
		GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
	`

	var role models.Role
	var permissions pq.StringArray
	err := r.db.QueryRow(query, id).Scan(
		&role.ID, &role.Name, &role.Description,
		&role.CreatedAt, &role.UpdatedAt, &permissions,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRoleNotFound
		}
		return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	role.Permissions = []string(permissions)
	return &role, nil
}

func (r *roleRepository) GetByName(name string) (*models.Role, error) {
	if r.db == nil {
		return nil, ErrRoleNotFound
	}

	query := `
		SELECT r.id, r.name, r.description, r.created_at::text, r.updated_at::text,
		       COALESCE(array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), '{}') as permissions
		FROM roles r
		LEFT JOIN role_permissions rp ON r.id = rp.role_id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		WHERE r.name = $1
		GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
	`

	var role models.Role
	var permissions pq.StringArray
	err := r.db.QueryRow(query, name).Scan(
		&role.ID, &role.Name, &role.Description,
		&role.CreatedAt, &role.UpdatedAt, &permissions,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrRoleNotFound
		}
		return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	role.Permissions = []string(permissions)
	return &role, nil
}

func (r *roleRepository) List() ([]*models.Role, error) {
	if r.db == nil {
		return []*models.Role{}, nil
	}

	query := `
		SELECT r.id, r.name, r.description, r.created_at::text, r.updated_at::text,
		       COALESCE(array_agg(p.name) FILTER (WHERE p.name IS NOT NULL), '{}') as permissions
		FROM roles r
		LEFT JOIN role_permissions rp ON r.id = rp.role_id
		LEFT JOIN permissions p ON rp.permission_id = p.id
		GROUP BY r.id, r.name, r.description, r.created_at, r.updated_at
		ORDER BY r.name
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}
	defer rows.Close()

	var roles []*models.Role
	for rows.Next() {
		var role models.Role
		var permissions pq.StringArray
		if err := rows.Scan(
			&role.ID, &role.Name, &role.Description,
			&role.CreatedAt, &role.UpdatedAt, &permissions,
		); err != nil {
			return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
		}
		role.Permissions = []string(permissions)
		roles = append(roles, &role)
	}

	return roles, nil
}

func (r *roleRepository) Create(role *models.Role) error {
	if r.db == nil {
		return ErrDatabaseOperation
	}

	query := `
		INSERT INTO roles (name, description)
		VALUES ($1, $2)
		RETURNING id, created_at::text, updated_at::text
	`

	err := r.db.QueryRow(query, role.Name, role.Description).Scan(
		&role.ID, &role.CreatedAt, &role.UpdatedAt,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return ErrRoleAlreadyExists
		}
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	return nil
}

func (r *roleRepository) AssignToUser(userID, roleID string) error {
	if r.db == nil {
		return ErrDatabaseOperation
	}

	query := `
		INSERT INTO user_roles (user_id, role_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, role_id) DO NOTHING
	`

	_, err := r.db.Exec(query, userID, roleID)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	return nil
}

func (r *roleRepository) RemoveFromUser(userID, roleID string) error {
	if r.db == nil {
		return ErrDatabaseOperation
	}

	query := `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`

	result, err := r.db.Exec(query, userID, roleID)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrRoleNotFound
	}

	return nil
}
