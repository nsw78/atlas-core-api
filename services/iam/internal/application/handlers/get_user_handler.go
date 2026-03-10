package handlers

import (
	"context"
	"fmt"

	"atlas-core-api/services/iam/internal/application/dto"
	"atlas-core-api/services/iam/internal/application/queries"
	"atlas-core-api/services/iam/internal/domain/repositories"
	"atlas-core-api/services/iam/internal/domain/valueobjects"
)

// GetUserHandler handles user retrieval queries
type GetUserHandler struct {
	userRepo repositories.UserRepository
}

func NewGetUserHandler(repo repositories.UserRepository) *GetUserHandler {
	return &GetUserHandler{userRepo: repo}
}

func (h *GetUserHandler) HandleByID(ctx context.Context, q queries.GetUserByIDQuery) (*dto.UserDTO, error) {
	userID, err := valueobjects.UserIDFromString(q.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	user, err := h.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	result := dto.UserFromAggregate(user)
	return &result, nil
}

func (h *GetUserHandler) HandleByUsername(ctx context.Context, q queries.GetUserByUsernameQuery) (*dto.UserDTO, error) {
	user, err := h.userRepo.FindByUsername(ctx, q.Username)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	result := dto.UserFromAggregate(user)
	return &result, nil
}

// ListUsersHandler handles paginated user listing queries
type ListUsersHandler struct {
	userRepo repositories.UserRepository
}

func NewListUsersHandler(repo repositories.UserRepository) *ListUsersHandler {
	return &ListUsersHandler{userRepo: repo}
}

func (h *ListUsersHandler) Handle(ctx context.Context, q queries.ListUsersQuery) (*dto.ListUsersResultDTO, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 100 {
		q.PageSize = 20
	}

	offset := (q.Page - 1) * q.PageSize
	users, total, err := h.userRepo.List(ctx, offset, q.PageSize)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	userDTOs := make([]dto.UserDTO, len(users))
	for i, u := range users {
		userDTOs[i] = dto.UserFromAggregate(u)
	}

	totalPages := total / q.PageSize
	if total%q.PageSize > 0 {
		totalPages++
	}

	return &dto.ListUsersResultDTO{
		Users:      userDTOs,
		Total:      total,
		Page:       q.Page,
		PageSize:   q.PageSize,
		TotalPages: totalPages,
	}, nil
}
