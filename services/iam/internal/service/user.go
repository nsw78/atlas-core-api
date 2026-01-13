package service

import (
	"atlas-core-api/services/iam/internal/repository"
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

func (s *UserService) GetByID(id string) (*repository.User, error) {
	return s.userRepo.GetByID(id)
}

func (s *UserService) GetByUsername(username string) (*repository.User, error) {
	return s.userRepo.GetByUsername(username)
}
