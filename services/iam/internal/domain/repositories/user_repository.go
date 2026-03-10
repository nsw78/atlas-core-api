package repositories

import (
	"context"
	"atlas-core-api/services/iam/internal/domain/aggregates"
	"atlas-core-api/services/iam/internal/domain/valueobjects"
)

type UserRepository interface {
	FindByID(ctx context.Context, id valueobjects.UserID) (*aggregates.UserAggregate, error)
	FindByUsername(ctx context.Context, username string) (*aggregates.UserAggregate, error)
	FindByEmail(ctx context.Context, email valueobjects.Email) (*aggregates.UserAggregate, error)
	Save(ctx context.Context, user *aggregates.UserAggregate) error
	Update(ctx context.Context, user *aggregates.UserAggregate) error
	Delete(ctx context.Context, id valueobjects.UserID) error
	List(ctx context.Context, offset, limit int) ([]*aggregates.UserAggregate, int, error)
}
