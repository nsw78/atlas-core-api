# ADR-001: Microservices Architecture with Domain-Driven Namespaces

## Status
Accepted

## Date
2024-01-15

## Context
ATLAS Core API needs to handle trade intelligence, risk assessment, sanctions screening, and compliance reporting. These domains have different scaling profiles, development velocities, and regulatory requirements.

## Decision
Adopt a microservices architecture organized by business domain with dedicated Kubernetes namespaces:

- **atlas-gateway**: API Gateway, GraphQL Gateway, Frontend
- **atlas-core**: IAM, Audit Logging, Sanctions Screening
- **atlas-intel**: Risk Assessment, Graph Intelligence, News Aggregator, NLP
- **atlas-ml**: Model Serving, Model Monitoring, XAI
- **atlas-data**: Airflow, Spark, Feature Store
- **atlas-infra**: Vault, service mesh control plane

## Consequences

### Positive
- Independent scaling per domain (sanctions screening can scale independently from graph analysis)
- Clear ownership boundaries aligned with team structure
- Namespace-level network policies enforce domain isolation
- Independent deployment cycles reduce blast radius

### Negative
- Increased operational complexity
- Cross-service communication latency
- Distributed transaction challenges
- Requires investment in observability tooling

### Mitigations
- Istio service mesh for consistent cross-service communication
- Event-driven architecture (Kafka) for eventual consistency
- Centralized observability with Prometheus + Grafana + Jaeger
