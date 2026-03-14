# ATLAS Event Catalog

All domain events in the ATLAS platform are published to Apache Kafka with structured envelopes and guaranteed ordering per aggregate.

## Event Envelope Format

```json
{
  "event_id": "uuid-v4",
  "event_type": "atlas.risk.assessed",
  "aggregate_id": "entity-uuid",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": 1,
  "source": "risk-assessment",
  "payload": { ... }
}
```

## IAM Events

| Event Type | Topic | Producer | Description |
|------------|-------|----------|-------------|
| `UserCreated` | `atlas.user.created` | IAM Service | New user registration with username, email, and default roles |
| `UserLoggedIn` | `atlas.user.logged_in` | IAM Service | Successful authentication with IP address and user agent |
| `UserLoggedOut` | `atlas.user.logged_out` | IAM Service | User session terminated |
| `LoginFailed` | `atlas.user.login_failed` | IAM Service | Failed authentication attempt with reason and attempt count |
| `UserRoleAssigned` | `atlas.user.role_assigned` | IAM Service | Role granted to user |
| `UserRoleRevoked` | `atlas.user.role_revoked` | IAM Service | Role removed from user |
| `UserDeactivated` | `atlas.user.deactivated` | IAM Service | Account deactivation with reason |
| `PasswordChanged` | `atlas.user.password_changed` | IAM Service | User password updated |

## Risk Assessment Events

| Event Type | Topic | Producer | Description |
|------------|-------|----------|-------------|
| `RiskAssessed` | `atlas.risk.assessed` | Risk Assessment | Risk assessment completed with multi-dimensional scores |
| `AlertTriggered` | `atlas.alert.triggered` | Risk Assessment | Risk threshold breached, alert created |
| `AlertResolved` | `atlas.alert.resolved` | Risk Assessment | Previously triggered alert resolved |
| `RiskThresholdBreached` | `atlas.risk.threshold_breached` | Risk Assessment | Specific risk dimension exceeded configured threshold |

## Other Events

| Event Type | Topic | Producer | Description |
|------------|-------|----------|-------------|
| `SimulationCompleted` | `atlas.simulation.completed` | Scenario Simulation | Monte Carlo or agent-based simulation finished |
| `OSINTCollected` | `atlas.osint.collected` | News Aggregator | New open-source intelligence data ingested |
| `NLPAnalyzed` | `atlas.nlp.analyzed` | NLP Service | NLP analysis (NER, sentiment, classification) completed |
| `GraphUpdated` | `atlas.graph.updated` | Graph Intelligence | Entity graph topology changed |
| `ComplianceViolation` | `atlas.compliance.violation` | Compliance Automation | Regulatory compliance breach detected |
| `IngestionCompleted` | `atlas.ingestion.completed` | Ingestion Service | Data ingestion batch processed |

## Sanctions & Trade Intelligence Events

| Event Type | Topic | Producer | Description |
|------------|-------|----------|-------------|
| `SanctionsScreened` | `atlas.sanctions.screened` | Sanctions Screening | Entity screened against global sanctions lists |
| `SanctionsMatchFound` | `atlas.sanctions.match_found` | Sanctions Screening | Positive match found against a sanctions list entry |
| `SanctionsListSynced` | `atlas.sanctions.list_synced` | Sanctions Screening | Sanctions list data refreshed from official source |
| `TradeRestrictionFound` | `atlas.trade.restriction_found` | Sanctions Screening | Trade restriction identified for entity/country pair |
| `TradeAdvisoryIssued` | `atlas.trade.advisory_issued` | Sanctions Screening | New trade advisory generated from intelligence analysis |

## Implemented Event Producers

| Event Type | Topic | Producer | Payload |
|------------|-------|----------|---------|
| `SimulationCompleted` | `atlas.simulations.completed` | Scenario Simulation | simulation_id, scenario_name, status, risk_score, timestamp |
| `NewsIngested` | `atlas.news.ingested` | News Aggregator | article_count, source, timestamp |
| `OSINTSignalCreated` | `atlas.osint.signal` | News Aggregator | signal_id, severity, signal_type, title, timestamp |
| `ComplianceScanCompleted` | `atlas.compliance.scan_completed` | Compliance Automation | scan_id, policy_id, status, score, findings_count, timestamp |
| `WargamingMoveSubmitted` | `atlas.wargaming.move_submitted` | War Gaming | game_id, move_id, team, turn_number, timestamp |

## Central Event Consumer

The audit-logging service has a Kafka consumer (`kafka_consumer.py`) that subscribes to ALL `atlas.*` topics.

- **Consumer group**: `atlas-audit-logging`
- Each event is persisted to the `audit_logs` table with the topic as `event_type`
- Includes exponential backoff retry on connection failures

## Partitioning Strategy

| Event Category | Partition Key | Rationale |
|----------------|---------------|-----------|
| User events | `user_id` | All events for a user are ordered |
| Risk events | `entity_id` | Risk assessments for an entity are ordered |
| Alert events | `alert_id` | Alert lifecycle events are ordered |
| Simulation events | `simulation_id` | Simulation progress is ordered |
| Ingestion events | `source_id` | Ingestion runs per source are ordered |
| Sanctions events | `entity_name` | Screening results for same entity are ordered |
| Trade events | `country_pair` | Trade intelligence per country pair is ordered |

## Consumer Groups

| Consumer Group | Topics | Purpose |
|----------------|--------|---------|
| `audit-logging` | `atlas.user.*`, `atlas.risk.*`, `atlas.alert.*` | Immutable audit trail |
| `dashboard-realtime` | `atlas.risk.*`, `atlas.alert.*`, `atlas.simulation.*` | WebSocket push to frontend |
| `analytics-pipeline` | `atlas.*` | Batch analytics and reporting |
| `notification-service` | `atlas.alert.triggered`, `atlas.compliance.violation` | Email/Slack notifications |
| `risk-enrichment` | `atlas.osint.collected`, `atlas.nlp.analyzed`, `atlas.graph.updated` | Risk score recalculation |
| `sanctions-monitor` | `atlas.sanctions.*`, `atlas.trade.*` | Sanctions compliance monitoring and alerting |
| `atlas-audit-sink` | `atlas.*` | Central event sink to audit_logs table |
