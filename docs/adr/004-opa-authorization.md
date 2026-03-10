# ADR-004: OPA for Centralized Authorization Policy

## Status
Accepted

## Date
2024-02-10

## Context
ATLAS has complex authorization requirements: 6 roles with different permissions, sanctions-specific policies (batch screening requires special permission, list management requires admin + MFA), data residency enforcement, and ML model deployment approval workflows. Embedding these rules in each service creates inconsistency.

## Decision
Adopt Open Policy Agent (OPA) with Rego policies for centralized authorization:
- **RBAC**: 6 roles (super_admin, admin, analyst, compliance_officer, viewer, api_consumer) with path/method permissions
- **Sanctions policies**: Batch operations require explicit permission, list management requires admin + MFA
- **ML policies**: Model deployment to production requires ml_deploy permission + MFA
- **Data residency**: EU data must be processed in EU-region services
- **Rate limiting**: Tier-based limits per role

## Consequences

### Positive
- Single source of truth for authorization logic
- Policies are testable (Rego unit tests)
- Decoupled from service implementations
- Auditable policy decisions

### Negative
- Learning curve for Rego language
- Additional network hop for policy evaluation
- Policy synchronization across OPA sidecars

### Mitigations
- Comprehensive test suite (11+ test cases covering all roles and edge cases)
- OPA bundle server for consistent policy distribution
- Local caching of policy decisions for frequently evaluated paths
