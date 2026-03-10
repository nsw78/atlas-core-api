# ADR-005: GraphQL Federation for Unified API Layer

## Status
Accepted

## Date
2024-02-15

## Context
The frontend and external consumers need to query data spanning multiple services (risk scores, sanctions results, graph intelligence, entity profiles) in a single request. The REST API Gateway handles routing but doesn't support cross-service data aggregation efficiently.

## Decision
Implement Apollo GraphQL Federation Gateway with 6 subgraphs:
- **Risk subgraph**: Risk scores, assessments, trends, alerts
- **Sanctions subgraph**: Screening results, sanctions lists, trade intelligence
- **Graph-Intel subgraph**: Entity relationships, communities, network analysis
- **IAM subgraph**: User profiles, permissions, organizations
- **OSINT subgraph**: News signals, briefings, sentiment
- **Simulations subgraph**: Scenarios, war games, policy impact

## Consequences

### Positive
- Single endpoint for complex cross-domain queries
- Client-driven data fetching (no over/under-fetching)
- Federation allows independent subgraph evolution
- Strong typing with schema validation

### Negative
- Additional gateway layer increases latency for simple queries
- Federation complexity (schema composition, entity resolution)
- N+1 query risk without proper DataLoader implementation
- Two API paradigms to maintain (REST + GraphQL)

### Mitigations
- REST for simple CRUD, GraphQL for complex dashboard queries
- DataLoader pattern for batched entity resolution
- Apollo Studio for schema governance and breaking change detection
- Prometheus metrics plugin for query performance monitoring
