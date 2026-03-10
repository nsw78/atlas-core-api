package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"atlas-core-api/services/iam/internal/domain/events"

	"github.com/google/uuid"
)

type EventEnvelope struct {
	EventID     string      `json:"event_id"`
	EventType   string      `json:"event_type"`
	AggregateID string      `json:"aggregate_id"`
	Timestamp   time.Time   `json:"timestamp"`
	Version     int         `json:"version"`
	Source      string      `json:"source"`
	Payload     interface{} `json:"payload"`
}

type KafkaEventPublisher struct {
	brokers []string
	topic   string
}

func NewKafkaEventPublisher(brokers []string) *KafkaEventPublisher {
	return &KafkaEventPublisher{
		brokers: brokers,
		topic:   "atlas.iam.events",
	}
}

func (p *KafkaEventPublisher) Publish(ctx context.Context, event events.DomainEvent) error {
	envelope := EventEnvelope{
		EventID:     uuid.New().String(),
		EventType:   event.EventType(),
		AggregateID: event.AggregateID(),
		Timestamp:   event.OccurredAt(),
		Version:     1,
		Source:      "iam-service",
		Payload:     event,
	}

	data, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// TODO: Replace with actual Kafka producer (segmentio/kafka-go or confluent-kafka-go)
	log.Printf("[Kafka] Publishing to %s: %s", p.topic, string(data))
	return nil
}

func (p *KafkaEventPublisher) Close() error {
	return nil
}

// InMemoryEventPublisher for testing and development
type InMemoryEventPublisher struct {
	Events []events.DomainEvent
}

func NewInMemoryEventPublisher() *InMemoryEventPublisher {
	return &InMemoryEventPublisher{Events: make([]events.DomainEvent, 0)}
}

func (p *InMemoryEventPublisher) Publish(ctx context.Context, event events.DomainEvent) error {
	p.Events = append(p.Events, event)
	return nil
}

func (p *InMemoryEventPublisher) Close() error {
	return nil
}
