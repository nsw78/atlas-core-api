# ADR-003: Event-Driven Architecture with Apache Kafka

## Status
Accepted

## Date
2024-02-01

## Context
Risk assessment requires aggregating signals from multiple sources (sanctions matches, trade anomalies, graph signals) in near-real-time. Synchronous request-response patterns create tight coupling and don't support the streaming analytics requirements of the data platform.

## Decision
Adopt Apache Kafka (Amazon MSK in production) as the event backbone:
- **Risk events**: `atlas.risk.*` topics for entity scoring, sanctions matches, trade anomalies
- **Alert events**: `atlas.alert.*` topics for alert lifecycle management
- **Audit events**: `atlas.audit.*` topics for compliance audit trail
- Replication factor of 3, min in-sync replicas of 2 for durability
- 14-day retention for regulatory compliance

## Consequences

### Positive
- Decoupled producers and consumers
- Natural support for event replay and audit trails
- Enables Spark Structured Streaming for real-time analytics
- Supports multiple consumer groups (risk aggregation, audit logging, analytics)

### Negative
- Eventual consistency model requires careful handling
- Additional infrastructure (MSK cluster) to manage
- Message ordering only guaranteed per partition
- Schema evolution requires coordination (consider Avro + Schema Registry)

### Mitigations
- Use entity_id as partition key for per-entity ordering
- Implement idempotent consumers with deduplication
- Plan for Schema Registry adoption in next iteration
