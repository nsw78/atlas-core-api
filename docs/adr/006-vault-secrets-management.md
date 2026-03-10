# ADR-006: HashiCorp Vault for Secrets Management

## Status
Accepted

## Date
2024-02-20

## Context
Services need access to database credentials, API keys, JWT signing keys, and Kafka certificates. Storing these as Kubernetes Secrets (base64-encoded) lacks encryption at rest, audit trails, automatic rotation, and dynamic secret generation.

## Decision
Adopt HashiCorp Vault with:
- **AppRole authentication** for service-to-Vault auth
- **KV v2 secret engine** for static secrets with versioning
- **CSI driver** integration for injecting secrets as volumes
- **Go client library** (`pkg/vault/`) with caching (5-min TTL), auto token renewal, and typed credential getters
- Secret paths: `atlas/data/database`, `atlas/data/redis`, `atlas/data/jwt`, `atlas/data/kafka`, `atlas/data/api-keys`

## Consequences

### Positive
- Encryption at rest and in transit
- Full audit trail of secret access
- Automatic token renewal prevents expiry
- Typed credential getters prevent configuration errors
- Path to dynamic secrets (database credentials) in future

### Negative
- Vault is a critical dependency (outage = service failures)
- Additional operational burden (unsealing, backup, HA)
- Cache TTL means brief window of stale credentials on rotation

### Mitigations
- Vault HA deployment with auto-unseal (AWS KMS)
- Credential caching with 5-minute TTL balances freshness vs availability
- Health check endpoint in Vault client for readiness probes
- Fallback to Kubernetes Secrets for non-sensitive config
