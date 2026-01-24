package repository

import (
	"database/sql"
	"errors"

	"github.com/lib/pq"
	models "atlas-core-api/services/iam/internal/domain"
)

type UserRepository interface {
	GetByID(id string) (*models.User, error)
	GetByUsername(username string) (*models.User, error)
	Create(user *models.User) error
	Update(user *models.User) error
	Delete(id string) error
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByID(id string) (*models.User, error) {
	// TODO: Implement database query
	return nil, errors.New("not implemented")
}

func (r *userRepository) GetByUsername(username string) (*models.User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at,
			   COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE u.username = $1 AND u.is_active = true
		GROUP BY u.id, u.username, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at
	`

	var user models.User
	var roles pq.StringArray
	err := r.db.QueryRow(query, username).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash, &user.Active, &user.CreatedAt, &user.UpdatedAt, &roles,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.Roles = []string(roles)
	return &user, nil
}

func (r *userRepository) Create(user *models.User) error {
	// TODO: Implement database insert
	return errors.New("not implemented")
}

func (r *userRepository) Update(user *models.User) error {
	// TODO: Implement database update
	return errors.New("not implemented")
}

func (r *userRepository) Delete(id string) error {
	// TODO: Implement database delete
	return errors.New("not implemented")
}
