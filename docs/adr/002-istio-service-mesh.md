# ADR-002: Istio Service Mesh for Zero-Trust Networking

## Status
Accepted

## Date
2024-01-20

## Context
Services need mutual TLS, traffic management (canary deployments, retries, circuit breaking), and fine-grained authorization policies. Building this into each service would be duplicative and error-prone.

## Decision
Adopt Istio as the service mesh with:
- **STRICT mTLS** across all namespaces
- **VirtualServices** for canary routing (95/5 split) and per-service timeouts
- **DestinationRules** with circuit breaking and outlier detection
- **AuthorizationPolicies** for zero-trust inter-service access control

## Consequences

### Positive
- Transparent mTLS without application changes
- Consistent retry/timeout/circuit-breaking across all services
- Fine-grained traffic control for safe deployments
- Authorization policies enforced at the infrastructure level

### Negative
- Sidecar proxy adds ~10ms latency per hop
- Increased memory overhead (~50MB per sidecar)
- Operational complexity of managing Istio control plane
- Debugging distributed traces is more complex

### Mitigations
- Tune sidecar resource limits per service profile
- Use Kiali for mesh visualization and debugging
- Jaeger for distributed tracing through Envoy proxies
