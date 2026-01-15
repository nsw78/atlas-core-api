# Phase 1: MVP — Foundation & Core Services

**Timeline:** Months 4-9 (6 months)  
**Status:** Specification Complete

---

## Objectives

1. Establish technical foundation with cloud-native architecture
2. Deliver a usable, secure MVP with core intelligence capabilities
3. Implement security baseline (Zero-Trust)
4. Create web-based dashboard for visualization
5. Enable basic risk assessment workflows

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Perimeter                        │
│  (API Gateway, WAF, DDoS Protection, mTLS, OAuth2/OIDC)    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│   Frontend   │   │   API Gateway   │  │   Mobile    │
│  (Next.js)   │   │   (Kong/Istio)  │  │   (Future)  │
└───────┬──────┘   └────────┬────────┘  └─────────────┘
        │                   │
        └───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│     IAM      │   │   Ingestion     │  │  Processing │
│   Service    │   │    Service      │  │   Service   │
└───────┬──────┘   └────────┬────────┘  └──────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│   Risk       │   │   Audit Log     │  │  Analytics  │
│  Assessment  │   │    Service      │  │   Service   │
└───────┬──────┘   └────────┬────────┘  └──────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐  ┌──────▼──────┐
│  PostgreSQL  │   │   PostgreSQL     │  │    Redis    │
│   (OLTP)     │   │   (Analytics)   │  │   (Cache)   │
└──────────────┘   └─────────────────┘  └─────────────┘
                            │
                    ┌───────▼───────┐
                    │     Kafka     │
                    │  (Event Bus)  │
                    └───────────────┘
```

---

## Core Microservices

### 1. Ingestion Service
**Technology:** Go  
**Responsibilities:**
- Accept data from legal sources (public APIs, licensed feeds, simulated data)
- Validate data format and schema
- Enrich with metadata (source, timestamp, provenance)
- Publish to Kafka for downstream processing
- Rate limiting and backpressure handling

**Key APIs:**
```
POST /api/v1/ingestion/sources/{source_id}/data
GET  /api/v1/ingestion/sources
GET  /api/v1/ingestion/status
```

**Data Sources (Phase 1):**
- Public news APIs (NewsAPI, RSS feeds)
- Licensed intelligence feeds (if available)
- Simulated/synthetic data generators
- Manual upload (CSV, JSON)

### 2. Normalization Service
**Technology:** Go  
**Responsibilities:**
- Consume raw data from Kafka
- Normalize formats (dates, currencies, locations)
- Entity extraction (basic)
- Data quality scoring
- Publish normalized events

**Key APIs:**
```
GET  /api/v1/normalization/rules
POST /api/v1/normalization/rules
GET  /api/v1/normalization/quality/{data_id}
```

### 3. Risk Scoring Service
**Technology:** Go (with Python ML stubs)  
**Responsibilities:**
- Calculate risk scores for entities
- Multi-dimensional risk assessment
- Risk trend analysis
- Alert generation (threshold-based)
- Historical risk tracking

**Key APIs:**
```
POST /api/v1/risk/assess
GET  /api/v1/risk/assessments/{entity_id}
GET  /api/v1/risk/trends
POST /api/v1/risk/alerts/configure
```

**Risk Dimensions:**
- Operational Risk
- Financial Risk
- Reputational Risk
- Geopolitical Risk
- Compliance Risk

### 4. Identity & Access Management (IAM) Service
**Technology:** Go  
**Responsibilities:**
- User authentication (OAuth2/OIDC)
- Role-based access control (RBAC)
- API key management
- Session management
- Multi-factor authentication (MFA)

**Key APIs:**
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/users/me
GET  /api/v1/users/{id}/permissions
```

### 5. Audit Logging Service
**Technology:** Go  
**Responsibilities:**
- Immutable audit logs
- User action tracking
- Data access logging
- Compliance event recording
- Log retention and archival

**Key APIs:**
```
GET  /api/v1/audit/logs
GET  /api/v1/audit/logs/{id}
POST /api/v1/audit/events
GET  /api/v1/audit/compliance/report
```

---

## Technology Stack

### Cloud Infrastructure
- **Primary:** AWS (or GCP/Azure)
- **Container Orchestration:** Kubernetes (EKS/GKE/AKS)
- **Service Mesh:** Istio (or Linkerd)
- **API Gateway:** Kong (or AWS API Gateway)

### Databases
- **OLTP:** PostgreSQL 15+ (with PostGIS for geospatial)
- **Analytics:** PostgreSQL (read replicas) + TimescaleDB (for time-series)
- **Cache:** Redis 7+ (with persistence)
- **Search:** Elasticsearch (optional, Phase 2)

### Messaging & Events
- **Event Bus:** Apache Kafka (with Zookeeper/KRaft)
- **Message Queue:** Redis Streams (for lightweight queues)

### Security
- **Secrets Management:** HashiCorp Vault (or AWS Secrets Manager)
- **Certificate Management:** cert-manager (Let's Encrypt)
- **Encryption:** AES-256 (at rest), TLS 1.3 (in transit)
- **Key Management:** AWS KMS (or equivalent)

### Observability
- **Logging:** Structured JSON logs (Zap for Go, Python logging)
- **Metrics:** Prometheus + Grafana
- **Tracing:** OpenTelemetry + Jaeger
- **Alerting:** Alertmanager + PagerDuty/OpsGenie

### Frontend
- **Framework:** Next.js 14 (React 18)
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Charts:** Recharts
- **Maps:** Mapbox GL JS (or OpenLayers)

---

## Security Baseline

### Zero-Trust Model
- **Network:** No implicit trust, all traffic encrypted (mTLS)
- **Identity:** Every request authenticated and authorized
- **Access:** Least privilege, role-based access control
- **Data:** Encryption at rest and in transit
- **Audit:** All actions logged immutably

### Implementation Checklist
- [ ] mTLS between all services
- [ ] OAuth2/OIDC for user authentication
- [ ] RBAC with fine-grained permissions
- [ ] Secrets stored in Vault/KMS
- [ ] All data encrypted (AES-256)
- [ ] TLS 1.3 for all external traffic
- [ ] WAF rules configured
- [ ] DDoS protection enabled
- [ ] Regular security scanning (Trivy, Snyk)
- [ ] Immutable audit logs

### Compliance Controls
- **GDPR:** Data minimization, right to deletion, consent management
- **LGPD:** Similar to GDPR, Brazilian data protection
- **ISO 27001:** Security management system (foundation)
- **SOC 2:** Controls for security, availability, confidentiality

---

## MVP Dashboard Features

### Home/Overview
- Platform status (service health)
- Key metrics (entities, risks, signals)
- Recent alerts
- Quick actions

### Data Ingestion
- Source status
- Ingestion rates
- Data quality metrics
- Recent data samples

### Risk Dashboard
- Risk scores by entity
- Risk trends (time-series)
- Risk dimension breakdown
- Alert management

### Audit & Compliance
- Audit log viewer
- Compliance status (GDPR/LGPD)
- User activity timeline

---

## API Contracts

### Core Endpoints

**Ingestion:**
```yaml
/api/v1/ingestion/sources:
  post:
    summary: Register new data source
    requestBody:
      schema:
        type: object
        properties:
          name: string
          type: enum[news_api, rss, manual, synthetic]
          config: object
    responses:
      201: Created
      400: Bad Request
      401: Unauthorized
```

**Risk Assessment:**
```yaml
/api/v1/risk/assess:
  post:
    summary: Assess risk for entity
    requestBody:
      schema:
        type: object
        properties:
          entity_id: string
          dimensions: array[string]
    responses:
      200: RiskAssessment
      404: Entity not found
```

**Audit:**
```yaml
/api/v1/audit/logs:
  get:
    summary: Query audit logs
    parameters:
      - user_id: string (optional)
      - action: string (optional)
      - start_date: datetime
      - end_date: datetime
    responses:
      200: AuditLog[]
```

---

## Deliverables

### Code
- [ ] All 5 core microservices implemented
- [ ] API Gateway configured
- [ ] Frontend dashboard (4 main views)
- [ ] Docker images for all services
- [ ] Kubernetes manifests
- [ ] Terraform/IaC for infrastructure

### Documentation
- [ ] API documentation (OpenAPI 3.0)
- [ ] Architecture diagrams
- [ ] Deployment guide
- [ ] Security checklist
- [ ] Runbooks for operations

### Testing
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] Security tests (OWASP Top 10)
- [ ] Load tests (baseline)

### Compliance
- [ ] GDPR compliance checklist
- [ ] LGPD compliance checklist
- [ ] Security baseline audit
- [ ] Data retention policies

---

## Definition of Done

### Functional
- ✅ All 5 microservices deployed and operational
- ✅ Frontend dashboard accessible and functional
- ✅ Data ingestion from at least 2 sources working
- ✅ Risk assessment generates scores
- ✅ Audit logs capture all critical actions
- ✅ User authentication and authorization working

### Non-Functional
- ✅ All services respond in <500ms (p95)
- ✅ System handles 1000 req/s (baseline)
- ✅ Zero-Trust security implemented
- ✅ All data encrypted
- ✅ Audit logs immutable
- ✅ 99.5% uptime (Phase 1 target)

### Compliance
- ✅ GDPR/LGPD controls in place
- ✅ Security baseline audit passed
- ✅ Documentation complete
- ✅ Runbooks available

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data quality issues | High | Robust validation, quality scoring |
| Security vulnerabilities | Critical | Regular scanning, security reviews |
| Scalability bottlenecks | Medium | Cloud-native design, load testing |
| Compliance gaps | High | Early compliance review, legal consultation |
| Team knowledge gaps | Medium | Comprehensive documentation, training |

---

## Success Metrics

- **Technical:**
  - 5 microservices deployed
  - API response time <500ms (p95)
  - 99.5% uptime
  - Zero critical security vulnerabilities

- **Functional:**
  - 2+ data sources integrated
  - Risk assessment accuracy >70% (baseline)
  - Dashboard load time <2s

- **Compliance:**
  - GDPR/LGPD controls verified
  - Security audit passed
  - Audit logs 100% complete

---

## Next Phase Preparation

At Month 8, begin planning for **Phase 2: Enhanced Analytics**:
- ML infrastructure setup
- Feature store design
- Model registry planning
- Graph database evaluation

---

**Document Version:** 1.0  
**Status:** Ready for Implementation
