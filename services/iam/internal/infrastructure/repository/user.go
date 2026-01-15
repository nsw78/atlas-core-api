package repository

import (
	"database/sql"
	"errors"

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
	// TODO: Implement database query
	return nil, errors.New("not implemented")
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
