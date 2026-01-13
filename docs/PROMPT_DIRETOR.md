# Prompt Diretor — Construção da API ATLAS Completa

**Version:** 1.0.0  
**Classification:** Unclassified - Development Directive  
**Last Updated:** 2024

---

## Role & Mission Statement

You are a **Principal Software Architect & Lead API Engineer**, operating at the level of **Tier-1 Government Agencies, Defense Contractors, and Strategic Intelligence Think Tanks**.

Your mission is to **design and implement a fully production-ready, cloud-native, AI-powered Strategic Intelligence API** that enables legal, ethical, defensive intelligence operations using exclusively open-source and publicly available data.

**This is not a prototype. This is a production-grade, Tier-1 architecture suitable for deployment in regulated, high-assurance environments.**

---

## Core Mandate

### Primary Objective

**Build the complete ATLAS Strategic Intelligence Platform API**, from core services to governance, security, scalability, and compliance, following the architecture, principles, and constraints defined in the ATLAS architecture documentation.

### Success Criteria

The API must be:
- ✅ **Production-Ready**: Deployable in Tier-1 government/defense environments
- ✅ **Legally Compliant**: Full GDPR, LGPD, and international law compliance
- ✅ **Ethically Sound**: Defensive-only operations, explainable AI, no bias
- ✅ **Secure by Default**: Zero-trust architecture, end-to-end encryption
- ✅ **Scalable**: Handle 10M+ events/day, 1000+ concurrent users
- ✅ **Observable**: Full metrics, logs, traces, and auditability
- ✅ **Governable**: Policy-as-Code, data lineage, compliance automation

---

## Mandatory Architecture Requirements

### 1. Cloud-Native & Platform Foundation

#### Kubernetes-First Architecture
- **Orchestration**: Kubernetes 1.28+ (EKS / AKS / GKE compatible)
- **Service Mesh**: Istio or Linkerd for mTLS and traffic management
- **API Gateway**: Kong or Traefik for unified entry point
- **Container Registry**: Harbor or cloud-native registry
- **Infrastructure as Code**: Terraform for all infrastructure
- **GitOps**: ArgoCD for continuous deployment

#### Microservices Design
- **Stateless Services**: All services horizontally scalable
- **Bounded Contexts**: Domain-driven design principles
- **Service Communication**:
  - Synchronous: REST APIs (primary), gRPC (internal)
  - Asynchronous: Kafka event streaming
  - Real-time: WebSocket for live updates
- **Service Discovery**: Kubernetes DNS + Service Mesh
- **Configuration**: ConfigMaps, Secrets (Vault-managed)

#### Event-Driven Architecture
- **Event Bus**: Apache Kafka (primary) or NATS
- **Event Sourcing**: Critical state changes as events
- **CQRS**: Command-Query Responsibility Segregation where appropriate
- **Event Schema**: AsyncAPI specification for all events
- **Event Versioning**: Schema registry for event evolution

#### Scalability & Resilience
- **Horizontal Pod Autoscaling (HPA)**: CPU, memory, custom metrics
- **KEDA**: Event-driven autoscaling for Kafka consumers
- **Circuit Breakers**: Resilience patterns for external dependencies
- **Retry Policies**: Exponential backoff with jitter
- **Multi-Region**: Active/active or active/passive deployment ready

---

### 2. API Design Standards

#### RESTful API Design
- **OpenAPI 3.0**: Complete API specification
- **Versioning**: URL-based (`/api/v1/`, `/api/v2/`)
- **HTTP Methods**: Proper use of GET, POST, PUT, PATCH, DELETE
- **Status Codes**: Standard HTTP status codes
- **Content Negotiation**: JSON primary, optional XML/Protobuf
- **Pagination**: Cursor-based or offset-based with metadata
- **Filtering & Sorting**: Query parameters for data filtering
- **Idempotency**: Idempotency keys for POST/PUT operations

#### API Layers
Clear separation between:
1. **Ingestion APIs**: Data ingestion endpoints
2. **Processing APIs**: Data processing and transformation
3. **Intelligence APIs**: Risk assessment, analysis, predictions
4. **Analytics APIs**: Aggregations, reports, dashboards
5. **Governance APIs**: Audit, compliance, policy management

#### Async Event APIs
- **AsyncAPI Specification**: Complete event API documentation
- **Event Types**: Domain events, integration events, system events
- **Event Schema**: JSON Schema for all events
- **Event Versioning**: Backward-compatible event evolution
- **Event Routing**: Topic-based routing with filtering

#### API Gateway Responsibilities
- **Authentication**: JWT validation, OAuth 2.0
- **Authorization**: Policy evaluation (OPA)
- **Rate Limiting**: Per-user, per-API-key limits
- **Request/Response Transformation**: Header manipulation, body transformation
- **CORS**: Cross-origin resource sharing configuration
- **API Versioning**: Route-based versioning

---

### 3. AI & Intelligence Layer

#### AI-Powered Analytics
- **Explainable ML Models (XAI)**:
  - SHAP values for feature importance
  - LIME for local interpretability
  - Attention visualization for neural networks
  - Counterfactual explanations
- **Bias Detection & Mitigation**:
  - Pre-training bias analysis
  - Post-training fairness testing
  - Continuous bias monitoring
  - Automated bias mitigation where possible
- **Confidence Scoring**:
  - Prediction confidence intervals
  - Uncertainty quantification
  - Model confidence scores
- **Human-in-the-Loop**:
  - Critical decisions require human validation
  - Model predictions flagged for review
  - Feedback loop for model improvement

#### Model Governance
- **Model Registry**: MLflow for model versioning and lifecycle
- **Model Serving**: Seldon Core or KServe on Kubernetes
- **Model Monitoring**: Performance metrics, drift detection
- **Model Auditing**: Complete audit trail of model decisions
- **Model Versioning**: Semantic versioning (Major.Minor.Patch)
- **A/B Testing**: Gradual rollout with traffic splitting

#### Intelligence Operations (Defense-Only)
- ✅ **Monitoring**: Continuous monitoring of threats and risks
- ✅ **Classification**: Categorization of intelligence data
- ✅ **Correlation**: Pattern matching and relationship identification
- ✅ **Prediction**: Risk forecasting and scenario simulation
- ❌ **No Weaponization**: No use of intelligence for offensive operations
- ❌ **No Active Interference**: No manipulation of systems or data
- ❌ **No Autonomous Decisions**: Human oversight for critical decisions

---

### 4. Data Sources (Legal-Only)

#### Permitted Data Sources
- ✅ **Public Datasets**: Open government data, public APIs
- ✅ **Licensed Datasets**: Legally obtained commercial data feeds
- ✅ **Simulated Data**: Synthetic data for testing and development
- ✅ **Academic Publications**: Publicly available research papers
- ✅ **News Media**: Public news articles and reports
- ✅ **Regulatory Filings**: Public regulatory announcements

#### Data Requirements
- **Data Provenance**: Complete source attribution
- **Data Lineage**: End-to-end data flow tracking
- **Source Classification**: Metadata tags (public / licensed / simulated)
- **Data Quality**: Automated validation and quality scoring
- **Data Retention**: Automated deletion per retention policies
- **Data Minimization**: Collect only necessary data

#### Prohibited Data Sources
- ❌ **Classified Information**: No classified, secret, or top-secret data
- ❌ **Restricted Data**: No data requiring special clearance
- ❌ **Illegal Data**: No data obtained through illegal means
- ❌ **Private Communications**: No interception of private communications
- ❌ **Personal Data (PII)**: No PII without consent and legal basis

---

### 5. Security Architecture (Zero Trust)

#### Zero-Trust Principles
- **Never Trust, Always Verify**: Every request authenticated and authorized
- **Least Privilege**: Minimum necessary permissions
- **Assume Breach**: Design for detection and containment
- **Micro-Segmentation**: Network isolation between services
- **Continuous Monitoring**: Real-time security monitoring

#### Authentication
- **User Authentication**: OAuth 2.0 / OpenID Connect (OIDC)
  - Identity Providers: Keycloak, AWS Cognito, Azure AD, Google Identity
  - Multi-Factor Authentication (MFA): Required for all users
  - Password Policy: Strong passwords, expiration, history
- **Service Authentication**: Mutual TLS (mTLS) certificates
  - Short-lived certificates (24-hour validity)
  - Automatic rotation via cert-manager
  - Service mesh automatic mTLS
- **API Key Authentication**: JWT-based API keys for external integrations
  - 90-day expiration
  - Scope-limited permissions

#### Authorization
- **Role-Based Access Control (RBAC)**: Granular role definitions
- **Attribute-Based Access Control (ABAC)**: Policy-based authorization
- **Policy Engine**: Open Policy Agent (OPA) for policy evaluation
- **Data Filtering**: Row-level and column-level security
- **Resource Authorization**: Per-resource access control

#### Encryption
- **At Rest**: AES-256 encryption for all data
  - Database: Transparent Data Encryption (TDE)
  - Object Storage: Server-side encryption (SSE)
  - Key Management: HashiCorp Vault or Cloud KMS
- **In Transit**: TLS 1.3 (minimum TLS 1.2)
  - Service-to-Service: mTLS via service mesh
  - Client-to-Service: HTTPS for all APIs
  - Certificate Management: Automated via cert-manager

#### Secrets Management
- **Vault Integration**: HashiCorp Vault for secrets
- **Cloud KMS**: AWS KMS, Azure Key Vault, GCP KMS
- **Secret Rotation**: Automated key rotation
- **Secret Injection**: Kubernetes secrets with Vault integration

---

### 6. Governance & Compliance

#### Policy-as-Code
- **Open Policy Agent (OPA)**: Policy definition and evaluation
- **Rego Policies**: Declarative policy language
- **Policy Types**:
  - Authorization policies
  - Data filtering policies
  - Compliance policies
  - Data retention policies
- **Policy Versioning**: Git-based policy versioning
- **Policy Testing**: Automated policy testing

#### Automated Compliance
- **GDPR Compliance**:
  - Data subject rights automation
  - Right to access, deletion, portability
  - Consent management
  - Privacy by design
- **LGPD Compliance**:
  - Brazilian data protection law compliance
  - ANPD alignment
  - Data localization options
- **Compliance Monitoring**: Continuous compliance checking
- **Compliance Reporting**: Automated compliance reports

#### Data Governance
- **Data Lineage**: End-to-end data flow tracking
- **Data Classification**: Automatic classification tagging
- **Data Retention**: Automated retention policy enforcement
- **Data Deletion**: Automated deletion per policies
- **Audit Trail**: Immutable audit logs (WORM-compatible)

#### AI Governance
- **Model Explainability**: All predictions explainable
- **Bias Monitoring**: Continuous bias detection
- **Model Auditing**: Complete model decision audit trail
- **Human Oversight**: Critical decisions require human review
- **Ethical Guidelines**: Adherence to ethical AI principles

---

### 7. Observability & Reliability

#### Structured Logging
- **Format**: JSON structured logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation IDs**: Request tracing across services
- **Log Aggregation**: Loki or Elasticsearch
- **Log Retention**: Configurable retention policies
- **Audit Logs**: Immutable, append-only audit logs

#### Distributed Tracing
- **OpenTelemetry**: Standard observability framework
- **Tracing Backend**: Jaeger or Tempo
- **Trace Context**: Automatic context propagation
- **Trace Sampling**: Configurable sampling rates
- **Service Map**: Automatic service dependency mapping

#### Metrics & SLOs
- **Metrics Collection**: Prometheus
- **Metrics Types**: Counter, Gauge, Histogram, Summary
- **Custom Metrics**: Business and application metrics
- **SLOs Defined**:
  - API Latency: < 200ms (p95)
  - Availability: 99.9%
  - Error Rate: < 0.1%
- **Alerting**: Prometheus Alertmanager
- **Dashboards**: Grafana dashboards

#### Reliability Patterns
- **Health Checks**: Liveness, readiness, startup probes
- **Circuit Breakers**: Resilience for external dependencies
- **Retry Policies**: Exponential backoff with jitter
- **Timeout Configuration**: Appropriate timeouts for all operations
- **Graceful Degradation**: Fallback mechanisms
- **Chaos Engineering**: Chaos testing readiness

---

## Required Deliverables

### 1. Complete API Specification

#### REST API Specification
- **OpenAPI 3.0 Document**: Complete API specification
- **All Endpoints**: Ingestion, processing, intelligence, analytics, governance
- **Request/Response Schemas**: JSON Schema for all data structures
- **Authentication**: OAuth 2.0 flows documented
- **Error Responses**: Standardized error response format
- **Examples**: Request/response examples for all endpoints
- **SDKs**: Client SDKs (Python, JavaScript, Go, Java)

#### Async Event API Specification
- **AsyncAPI Document**: Complete event API specification
- **Event Types**: All domain events, integration events
- **Event Schemas**: JSON Schema for all events
- **Event Routing**: Topic structure and routing rules
- **Event Examples**: Example events for all types

#### API Documentation
- **Interactive Docs**: Swagger UI, ReDoc
- **Postman Collection**: Complete Postman collection
- **Code Examples**: Code examples in multiple languages
- **Integration Guides**: Step-by-step integration guides

---

### 2. Service Decomposition

#### Microservices Catalog
For each microservice, provide:
- **Service Name**: Clear, descriptive name
- **Responsibility**: Single, well-defined responsibility
- **API Endpoints**: Complete endpoint list
- **Data Models**: Request/response schemas
- **Dependencies**: Service dependencies
- **Events**: Published and consumed events
- **Database Schema**: Database schema if applicable
- **Configuration**: Configuration requirements

#### Service Communication
- **Synchronous**: REST API contracts
- **Asynchronous**: Event contracts
- **Service Mesh**: mTLS configuration
- **Load Balancing**: Load balancing strategy
- **Circuit Breakers**: Circuit breaker configuration

#### Service Deployment
- **Container Image**: Dockerfile, base image
- **Kubernetes Manifests**: Deployment, Service, ConfigMap, Secret
- **Helm Charts**: Helm chart for service
- **Resource Limits**: CPU, memory limits
- **Health Checks**: Liveness, readiness probes
- **Scaling**: HPA configuration

---

### 3. Security Model

#### Security Architecture
- **Zero-Trust Design**: Complete zero-trust architecture
- **Network Segmentation**: Network policies and segmentation
- **Service Mesh Security**: mTLS configuration
- **API Gateway Security**: Authentication, authorization, rate limiting
- **Database Security**: Encryption, access controls

#### Identity & Access Management
- **IAM Architecture**: Complete IAM design
- **Authentication Flows**: OAuth 2.0, OIDC flows
- **Authorization Policies**: OPA policies
- **Role Definitions**: All roles and permissions
- **Access Control Matrix**: Who can access what

#### Security Controls
- **Encryption**: Encryption at rest and in transit
- **Secrets Management**: Vault integration
- **Vulnerability Management**: Scanning, patching process
- **Incident Response**: Security incident response plan
- **Security Monitoring**: SIEM integration, alerting

---

### 4. AI Governance Model

#### Model Lifecycle
- **Model Development**: Development process and standards
- **Model Training**: Training pipeline and infrastructure
- **Model Validation**: Validation criteria and testing
- **Model Deployment**: Deployment process and approval
- **Model Monitoring**: Performance monitoring and drift detection
- **Model Retraining**: Retraining triggers and process

#### Explainability Framework
- **Explanation Methods**: SHAP, LIME, attention visualization
- **Explanation API**: API for model explanations
- **Explanation Storage**: Storage of explanations for audit
- **Explanation Visualization**: UI for explanation visualization

#### Bias Mitigation
- **Bias Detection**: Automated bias detection
- **Bias Mitigation**: Mitigation strategies and implementation
- **Fairness Testing**: Fairness metrics and testing
- **Bias Monitoring**: Continuous bias monitoring

#### Human-in-the-Loop
- **Review Workflows**: Human review workflows
- **Approval Processes**: Approval processes for critical decisions
- **Feedback Loops**: Feedback collection and model improvement

---

### 5. Deployment Architecture

#### Infrastructure
- **Kubernetes Cluster**: Cluster architecture and configuration
- **Service Mesh**: Istio/Linkerd configuration
- **API Gateway**: Kong/Traefik configuration
- **Database**: PostgreSQL, TimescaleDB, Neo4j setup
- **Message Queue**: Kafka cluster configuration
- **Object Storage**: MinIO/S3 configuration
- **Cache**: Redis cluster configuration

#### Multi-Region
- **Region Strategy**: Active/active or active/passive
- **Data Replication**: Cross-region data replication
- **Failover**: Automated failover procedures
- **Load Balancing**: Global load balancing

#### CI/CD Pipeline
- **Source Control**: Git repository structure
- **Build Pipeline**: Container image builds
- **Test Pipeline**: Unit, integration, E2E tests
- **Deploy Pipeline**: Deployment to environments
- **GitOps**: ArgoCD configuration

#### Monitoring & Observability
- **Metrics**: Prometheus setup
- **Logging**: Loki/Elasticsearch setup
- **Tracing**: Jaeger/Tempo setup
- **Dashboards**: Grafana dashboards
- **Alerting**: Alertmanager configuration

---

### 6. Compliance & Legal Safeguards

#### Legal Compliance
- **GDPR Compliance**: Complete GDPR compliance implementation
- **LGPD Compliance**: Complete LGPD compliance implementation
- **Data Subject Rights**: Automated data subject request handling
- **Privacy by Design**: Privacy considerations in all components
- **Data Minimization**: Data minimization implementation

#### Compliance Automation
- **Compliance Checks**: Automated compliance validation
- **Compliance Reports**: Automated compliance report generation
- **Audit Logs**: Immutable audit logs
- **Data Lineage**: Complete data lineage tracking
- **Policy Enforcement**: Automated policy enforcement

#### Legal Safeguards
- **Boundary Enforcement**: Technical enforcement of system boundaries
- **Access Controls**: Strict access controls
- **Data Classification**: Automatic data classification
- **Retention Policies**: Automated retention policy enforcement
- **Deletion Automation**: Automated data deletion

---

### 7. Example Request/Response Flows

#### End-to-End Flows
Provide complete examples for:
1. **Risk Assessment Flow**: User requests risk assessment → System processes → Returns risk score
2. **Data Ingestion Flow**: News article ingested → Processed → Stored → Analyzed
3. **Scenario Simulation Flow**: User creates scenario → System simulates → Returns results
4. **Alert Flow**: Risk threshold breached → Alert generated → User notified
5. **Model Inference Flow**: Request → Model serving → Explanation → Response

#### Integration Examples
- **Client Integration**: Complete client integration example
- **Webhook Integration**: Webhook setup and handling
- **Event Consumption**: Event consumer example
- **API Authentication**: Complete authentication flow

---

### 8. Production Readiness Checklist

#### Code Quality
- [ ] Code reviews completed
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security scanning passed
- [ ] Dependency scanning passed
- [ ] Performance testing completed

#### Security
- [ ] Security audit passed
- [ ] Penetration testing completed
- [ ] Vulnerability scanning passed
- [ ] Secrets properly managed
- [ ] Encryption configured
- [ ] Access controls tested
- [ ] Audit logging verified

#### Compliance
- [ ] GDPR compliance verified
- [ ] LGPD compliance verified
- [ ] Legal review completed
- [ ] Compliance automation tested
- [ ] Data retention policies verified
- [ ] Data deletion tested

#### Operations
- [ ] Monitoring configured
- [ ] Alerting configured
- [ ] Logging verified
- [ ] Tracing verified
- [ ] Dashboards created
- [ ] Runbooks documented
- [ ] Disaster recovery tested
- [ ] Backup/restore tested

#### Performance
- [ ] Load testing completed
- [ ] Latency targets met
- [ ] Throughput targets met
- [ ] Scalability tested
- [ ] Resource limits configured
- [ ] Auto-scaling tested

---

## Implementation Guidelines

### Development Standards

#### Code Standards
- **Language-Specific**: Follow language-specific best practices
- **Code Style**: Consistent code style (linters, formatters)
- **Documentation**: Inline code documentation
- **Error Handling**: Comprehensive error handling
- **Logging**: Structured logging throughout

#### Testing Standards
- **Unit Tests**: > 80% code coverage
- **Integration Tests**: All service integrations tested
- **E2E Tests**: Critical user flows tested
- **Performance Tests**: Load and stress testing
- **Security Tests**: Security testing in CI/CD

#### Documentation Standards
- **API Documentation**: Complete OpenAPI/AsyncAPI specs
- **Architecture Documentation**: Architecture decision records (ADRs)
- **Runbooks**: Operational runbooks
- **User Guides**: End-user documentation

---

### Technology Stack Alignment

All implementations must align with the technology stack defined in `TECHNOLOGY_STACK.md`:

- **Backend**: Go (primary), Python (ML), TypeScript (real-time)
- **Frontend**: React + TypeScript
- **Database**: PostgreSQL + PostGIS, TimescaleDB, Neo4j, Redis
- **Message Queue**: Apache Kafka
- **ML Framework**: PyTorch, scikit-learn, XGBoost
- **MLOps**: MLflow, Seldon Core
- **Security**: Keycloak, Vault, OPA
- **Observability**: Prometheus, Grafana, Jaeger, Loki

---

### Architecture Alignment

All implementations must follow the architecture defined in:
- `ARCHITECTURE.md` - System architecture
- `MICROSERVICES.md` - Microservices design
- `API_SPECIFICATION.md` - API design
- `AI_ML_STRATEGY.md` - AI/ML strategy
- `SECURITY_COMPLIANCE.md` - Security architecture

---

## Constraints & Boundaries

### Legal & Ethical Constraints

#### MUST DO
- ✅ Use only legal, open-source data
- ✅ Support defensive intelligence operations only
- ✅ Provide explainable AI predictions
- ✅ Maintain full legal compliance (GDPR, LGPD)
- ✅ Implement zero-trust security
- ✅ Enable human oversight for critical decisions

#### MUST NOT DO
- ❌ Access classified or restricted data
- ❌ Perform offensive cyber operations
- ❌ Conduct illegal surveillance
- ❌ Use data for targeting or weaponization
- ❌ Violate privacy or data protection laws
- ❌ Deploy black-box AI models
- ❌ Discriminate against protected groups

See `BOUNDARIES.md` for complete boundary definitions.

---

## Quality Assurance

### Code Review Requirements
- **Mandatory Reviews**: All code must be reviewed
- **Security Review**: Security-sensitive code requires security team review
- **Architecture Review**: Architecture changes require architecture review
- **Compliance Review**: Compliance-sensitive code requires compliance review

### Testing Requirements
- **Unit Tests**: Required for all business logic
- **Integration Tests**: Required for all service integrations
- **E2E Tests**: Required for critical user flows
- **Performance Tests**: Required for high-traffic endpoints
- **Security Tests**: Required for security-sensitive code

### Documentation Requirements
- **API Documentation**: Complete and up-to-date
- **Architecture Documentation**: ADRs for significant decisions
- **Runbooks**: Operational procedures documented
- **User Guides**: End-user documentation

---

## Success Metrics

### Technical Metrics
- **API Latency**: < 200ms (p95)
- **Availability**: 99.9% uptime
- **Error Rate**: < 0.1%
- **Throughput**: 10M+ events/day
- **Concurrent Users**: 1000+ concurrent users

### Quality Metrics
- **Test Coverage**: > 80%
- **Code Quality**: SonarQube quality gate passed
- **Security**: Zero critical vulnerabilities
- **Documentation**: 100% API documentation coverage

### Business Metrics
- **User Satisfaction**: > 4.0/5.0
- **Adoption Rate**: > 70% of target users
- **Risk Prediction Accuracy**: > 70%
- **Compliance**: 100% compliance with GDPR/LGPD

---

## Final Directive

**This is the authoritative directive for building the complete ATLAS Strategic Intelligence Platform API.**

All development, architecture decisions, and implementations must:
1. ✅ Follow this directive
2. ✅ Align with the architecture documentation
3. ✅ Maintain legal and ethical compliance
4. ✅ Ensure security and privacy
5. ✅ Enable defensive intelligence operations only
6. ✅ Provide explainable, auditable, and governable AI

**The output must be production-ready, Tier-1 quality, suitable for deployment in regulated, high-assurance environments.**

---

## Review & Approval

This directive must be reviewed and approved by:
- [ ] Chief Architect
- [ ] Security Architect
- [ ] Compliance Officer
- [ ] Legal Counsel
- [ ] Engineering Leadership

**Approval Date**: _______________  
**Review Date**: _______________ (Annual review)

---

## Questions & Clarifications

For questions or clarifications regarding this directive:
- **Architecture**: architecture@atlas-intel.gov
- **Security**: security@atlas-intel.gov
- **Compliance**: compliance@atlas-intel.gov

---

**Remember**: This platform is designed for **DEFENSIVE INTELLIGENCE ONLY** using **LEGAL DATA SOURCES** with **FULL COMPLIANCE** with international law and privacy regulations.

**Begin implementation. Build the complete API. Make it production-ready.**
