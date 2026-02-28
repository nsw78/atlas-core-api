package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"
	models "atlas-core-api/services/iam/internal/domain"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrDatabaseOperation = errors.New("database operation failed")
)

type UserRepository interface {
	GetByID(id string) (*models.User, error)
	GetByUsername(username string) (*models.User, error)
	GetByEmail(email string) (*models.User, error)
	Create(user *models.User) error
	Update(user *models.User) error
	Delete(id string) error
	List(offset, limit int) ([]*models.User, int, error)
	UpdateLastLogin(id string) error
	Deactivate(id string) error
}

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByID(id string) (*models.User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.is_active,
		       u.created_at::text, u.updated_at::text,
		       COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE u.id = $1
		GROUP BY u.id, u.username, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at
	`

	var user models.User
	var roles pq.StringArray
	err := r.db.QueryRow(query, id).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Active, &user.CreatedAt, &user.UpdatedAt, &roles,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	user.Roles = []string(roles)
	return &user, nil
}

func (r *userRepository) GetByUsername(username string) (*models.User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.is_active,
		       u.created_at::text, u.updated_at::text,
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
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Active, &user.CreatedAt, &user.UpdatedAt, &roles,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	user.Roles = []string(roles)
	return &user, nil
}

func (r *userRepository) GetByEmail(email string) (*models.User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password_hash, u.is_active,
		       u.created_at::text, u.updated_at::text,
		       COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE u.email = $1 AND u.is_active = true
		GROUP BY u.id, u.username, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at
	`

	var user models.User
	var roles pq.StringArray
	err := r.db.QueryRow(query, email).Scan(
		&user.ID, &user.Username, &user.Email, &user.PasswordHash,
		&user.Active, &user.CreatedAt, &user.UpdatedAt, &roles,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	user.Roles = []string(roles)
	return &user, nil
}

func (r *userRepository) Create(user *models.User) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}
	defer tx.Rollback()

	query := `
		INSERT INTO users (username, email, password_hash, is_active, is_verified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, created_at::text, updated_at::text
	`

	err = tx.QueryRow(query, user.Username, user.Email, user.PasswordHash, user.Active).Scan(
		&user.ID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return ErrUserAlreadyExists
		}
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	// Assign default viewer role
	roleQuery := `
		INSERT INTO user_roles (user_id, role_id)
		SELECT $1, id FROM roles WHERE name = 'viewer'
		ON CONFLICT (user_id, role_id) DO NOTHING
	`
	_, err = tx.Exec(roleQuery, user.ID)
	if err != nil {
		return fmt.Errorf("%w: failed to assign default role: %v", ErrDatabaseOperation, err)
	}

	return tx.Commit()
}

func (r *userRepository) Update(user *models.User) error {
	query := `
		UPDATE users
		SET username = $2, email = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND is_active = true
		RETURNING updated_at::text
	`

	err := r.db.QueryRow(query, user.ID, user.Username, user.Email).Scan(&user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrUserNotFound
		}
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return ErrUserAlreadyExists
		}
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	return nil
}

func (r *userRepository) Delete(id string) error {
	query := `
		UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND is_active = true
	`

	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	if rowsAffected == 0 {
		return ErrUserNotFound
	}

	return nil
}

func (r *userRepository) List(offset, limit int) ([]*models.User, int, error) {
	countQuery := `SELECT COUNT(*) FROM users WHERE is_active = true`
	var total int
	if err := r.db.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}

	query := `
		SELECT u.id, u.username, u.email, u.is_active,
		       u.created_at::text, u.updated_at::text,
		       COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
		FROM users u
		LEFT JOIN user_roles ur ON u.id = ur.user_id
		LEFT JOIN roles r ON ur.role_id = r.id
		WHERE u.is_active = true
		GROUP BY u.id, u.username, u.email, u.is_active, u.created_at, u.updated_at
		ORDER BY u.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Query(query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		var user models.User
		var roles pq.StringArray
		if err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.Active,
			&user.CreatedAt, &user.UpdatedAt, &roles,
		); err != nil {
			return nil, 0, fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
		}
		user.Roles = []string(roles)
		users = append(users, &user)
	}

	return users, total, nil
}

func (r *userRepository) UpdateLastLogin(id string) error {
	query := `UPDATE users SET last_login_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := r.db.Exec(query, id, time.Now())
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDatabaseOperation, err)
	}
	return nil
}

func (r *userRepository) Deactivate(id string) error {
	return r.Delete(id)
}
