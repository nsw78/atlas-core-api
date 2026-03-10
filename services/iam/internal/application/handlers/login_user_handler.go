package handlers

import (
	"context"
	"fmt"

	"atlas-core-api/services/iam/internal/application/commands"
	"atlas-core-api/services/iam/internal/domain/repositories"
)

type LoginUserHandler struct {
	userRepo  repositories.UserRepository
	publisher EventPublisher
}

func NewLoginUserHandler(repo repositories.UserRepository, pub EventPublisher) *LoginUserHandler {
	return &LoginUserHandler{userRepo: repo, publisher: pub}
}

func (h *LoginUserHandler) Handle(ctx context.Context, cmd commands.LoginUserCommand) error {
	user, err := h.userRepo.FindByUsername(ctx, cmd.Username)
	if err != nil {
		return fmt.Errorf("invalid credentials")
	}

	if !user.IsActive() {
		return fmt.Errorf("account is deactivated")
	}

	if !user.VerifyPassword(cmd.Password) {
		return fmt.Errorf("invalid credentials")
	}

	user.RecordLogin(cmd.IPAddress, cmd.UserAgent)

	if err := h.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update login record: %w", err)
	}

	for _, event := range user.DomainEvents() {
		_ = h.publisher.Publish(ctx, event)
	}
	user.ClearEvents()

	return nil
}
