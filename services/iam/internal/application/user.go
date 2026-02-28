package service

import (
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"

	models "atlas-core-api/services/iam/internal/domain"
	"atlas-core-api/services/iam/internal/infrastructure/repository"
)

var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user or email already exists")
	ErrInvalidInput      = errors.New("invalid input")
	ErrForbidden         = errors.New("forbidden")
)

type UserService struct {
	userRepo repository.UserRepository
	roleRepo repository.RoleRepository
}

func NewUserService(userRepo repository.UserRepository, roleRepo repository.RoleRepository) *UserService {
	return &UserService{
		userRepo: userRepo,
		roleRepo: roleRepo,
	}
}

func (s *UserService) GetByID(id string) (*models.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	// Strip password hash before returning
	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) GetByUsername(username string) (*models.User, error) {
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	user.PasswordHash = ""
	return user, nil
}

type CreateUserRequest struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (s *UserService) Create(req CreateUserRequest) (*models.User, error) {
	if req.Username == "" || req.Email == "" || req.Password == "" {
		return nil, fmt.Errorf("%w: username, email and password are required", ErrInvalidInput)
	}

	if len(req.Password) < 8 {
		return nil, fmt.Errorf("%w: password must be at least 8 characters", ErrInvalidInput)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Active:       true,
	}

	if err := s.userRepo.Create(user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, ErrUserAlreadyExists
		}
		return nil, err
	}

	user.PasswordHash = ""
	return user, nil
}

type UpdateUserRequest struct {
	Username  *string `json:"username,omitempty"`
	Email     *string `json:"email,omitempty"`
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
}

func (s *UserService) Update(id string, req UpdateUserRequest) (*models.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if req.Username != nil {
		user.Username = *req.Username
	}
	if req.Email != nil {
		user.Email = *req.Email
	}
	if req.FirstName != nil {
		user.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		user.LastName = *req.LastName
	}

	if err := s.userRepo.Update(user); err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			return nil, ErrUserAlreadyExists
		}
		return nil, err
	}

	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) Delete(id string) error {
	if err := s.userRepo.Delete(id); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrUserNotFound
		}
		return err
	}
	return nil
}

type ListUsersResult struct {
	Users []*models.User `json:"users"`
	Total int            `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
}

func (s *UserService) List(page, limit int) (*ListUsersResult, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit
	users, total, err := s.userRepo.List(offset, limit)
	if err != nil {
		return nil, err
	}

	// Strip password hashes
	for _, u := range users {
		u.PasswordHash = ""
	}

	return &ListUsersResult{
		Users: users,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

// Role management delegated methods

func (s *UserService) ListRoles() ([]*models.Role, error) {
	return s.roleRepo.List()
}

func (s *UserService) GetRole(id string) (*models.Role, error) {
	role, err := s.roleRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	return role, nil
}

type CreateRoleRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *UserService) CreateRole(req CreateRoleRequest) (*models.Role, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("%w: role name is required", ErrInvalidInput)
	}

	role := &models.Role{
		Name:        req.Name,
		Description: req.Description,
	}

	if err := s.roleRepo.Create(role); err != nil {
		return nil, err
	}

	return role, nil
}

func (s *UserService) AssignRole(userID, roleID string) error {
	// Verify user exists
	if _, err := s.userRepo.GetByID(userID); err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return ErrUserNotFound
		}
		return err
	}

	return s.roleRepo.AssignToUser(userID, roleID)
}

func (s *UserService) RemoveRole(userID, roleID string) error {
	return s.roleRepo.RemoveFromUser(userID, roleID)
}
