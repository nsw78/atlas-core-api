package handlers

import (
	"context"
	"fmt"

	"atlas-core-api/services/iam/internal/application/commands"
	"atlas-core-api/services/iam/internal/application/dto"
	"atlas-core-api/services/iam/internal/domain/aggregates"
	"atlas-core-api/services/iam/internal/domain/repositories"
	"atlas-core-api/services/iam/internal/domain/valueobjects"
)

// CreateUserHandler handles the CreateUserCommand
type CreateUserHandler struct {
	userRepo  repositories.UserRepository
	publisher EventPublisher
}

func NewCreateUserHandler(repo repositories.UserRepository, pub EventPublisher) *CreateUserHandler {
	return &CreateUserHandler{userRepo: repo, publisher: pub}
}

func (h *CreateUserHandler) Handle(ctx context.Context, cmd commands.CreateUserCommand) (*dto.UserDTO, error) {
	email, err := valueobjects.NewEmail(cmd.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	existing, _ := h.userRepo.FindByUsername(ctx, cmd.Username)
	if existing != nil {
		return nil, fmt.Errorf("username already exists: %s", cmd.Username)
	}

	existingEmail, _ := h.userRepo.FindByEmail(ctx, email)
	if existingEmail != nil {
		return nil, fmt.Errorf("email already registered: %s", cmd.Email)
	}

	hashedPassword, err := valueobjects.NewHashedPassword(cmd.Password)
	if err != nil {
		return nil, fmt.Errorf("password validation failed: %w", err)
	}

	user := aggregates.NewUserAggregate(cmd.Username, email, hashedPassword)

	if err := h.userRepo.Save(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to save user: %w", err)
	}

	for _, event := range user.DomainEvents() {
		if err := h.publisher.Publish(ctx, event); err != nil {
			_ = err // Log but don't fail - eventual consistency
		}
	}
	user.ClearEvents()

	result := dto.UserFromAggregate(user)
	return &result, nil
}
