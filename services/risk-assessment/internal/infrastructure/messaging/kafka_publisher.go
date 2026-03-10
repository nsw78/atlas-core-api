package messaging

import (
	"context"
	"encoding/json"
	"fmt"

	"go.uber.org/zap"

	"atlas-core-api/services/risk-assessment/internal/domain/events"
)

// KafkaEventPublisher publishes risk domain events to Kafka
type KafkaEventPublisher struct {
	brokers []string
	logger  *zap.Logger
}

func NewKafkaEventPublisher(brokers []string, logger *zap.Logger) *KafkaEventPublisher {
	return &KafkaEventPublisher{
		brokers: brokers,
		logger:  logger,
	}
}

func (p *KafkaEventPublisher) Publish(ctx context.Context, event events.DomainEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	topic := event.EventType()

	p.logger.Info("Publishing risk domain event",
		zap.String("topic", topic),
		zap.String("aggregate_id", event.AggregateID()),
		zap.String("event_type", event.EventType()),
		zap.Int("payload_size", len(payload)),
	)

	// TODO: Replace with actual Kafka producer (sarama/confluent-kafka-go)
	// Use entity_id as partition key for ordering guarantees
	return nil
}

func (p *KafkaEventPublisher) Close() error {
	return nil
}

// InMemoryEventPublisher for testing
type InMemoryEventPublisher struct {
	events []events.DomainEvent
	logger *zap.Logger
}

func NewInMemoryEventPublisher(logger *zap.Logger) *InMemoryEventPublisher {
	return &InMemoryEventPublisher{
		events: make([]events.DomainEvent, 0),
		logger: logger,
	}
}

func (p *InMemoryEventPublisher) Publish(ctx context.Context, event events.DomainEvent) error {
	p.events = append(p.events, event)
	p.logger.Debug("Risk event published (in-memory)",
		zap.String("type", event.EventType()),
		zap.String("aggregate_id", event.AggregateID()),
	)
	return nil
}

func (p *InMemoryEventPublisher) Close() error          { return nil }
func (p *InMemoryEventPublisher) Events() []events.DomainEvent { return p.events }
