package handlers

import (
	"context"
	"atlas-core-api/services/iam/internal/domain/events"
)

type EventPublisher interface {
	Publish(ctx context.Context, event events.DomainEvent) error
	Close() error
}
