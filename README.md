# ATLAS Core API

**Strategic Intelligence Platform** | Enterprise-Grade Microservices Architecture

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go&logoColor=white)]()
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat&logo=nextdotjs&logoColor=white)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat&logo=typescript&logoColor=white)]()
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat&logo=postgresql&logoColor=white)]()
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)]()
[![Kafka](https://img.shields.io/badge/Kafka-7.5-231F20?style=flat&logo=apachekafka&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)]()
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20PT--BR%20%7C%20ES-blue?style=flat)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)]()

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Frontend Application](#frontend-application)
- [Enterprise Features](#enterprise-features)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Service Registry](#service-registry)
- [Database Schema](#database-schema)
- [Middleware Pipeline](#middleware-pipeline)
- [Observability](#observability)
- [Configuration Reference](#configuration-reference)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

> **API Manual**: For the complete endpoint reference with request/response examples, see [docs/API_MANUAL.md](docs/API_MANUAL.md).

---

## Overview

ATLAS is an enterprise-grade Strategic Intelligence platform designed for organizations that require strategic risk analysis, scenario simulation, geospatial intelligence, and near real-time decision support. Built on a cloud-native microservices architecture with 29 containerized services, it provides:

- **Multidimensional Risk Analysis** across Operational, Financial, Reputational, Geopolitical, and Compliance dimensions
- **Machine Learning Pipeline** with MLflow experiment tracking, model serving, drift monitoring, and explainability (XAI)
- **Natural Language Processing** for entity recognition, sentiment analysis, classification, and document summarization
- **Graph Intelligence** powered by relationship mapping, centrality analysis, community detection, and risk propagation
- **Scenario Simulation** with Monte Carlo methods and agent-based modeling
- **Digital Twins** of infrastructure, supply chain, and economic systems
- **Geospatial Intelligence** with PostGIS-backed spatial queries and supply chain mapping
- **Automated Compliance** with Policy-as-Code, continuous auditing, and evidence generation
- **OSINT Collection** aggregating open-source intelligence from news, legal, and licensed data sources

---

## Architecture

### System Overview

```
                                    +-------------------+
                                    |    Frontend       |
                                    |  Next.js + TS     |
                                    |  :3004            |
                                    +--------+----------+
                                             |
                                    +--------v----------+
                                    |   API Gateway     |
                                    |   Go + Gin        |
                                    |   :8080           |
                                    |                   |
                                    | JWT Auth          |
                                    | Rate Limiting     |
                                    | Circuit Breaker   |
                                    | Idempotency       |
                                    | Request Signing   |
                                    | Response Cache    |
                                    +---+-----+-----+--+
                                        |     |     |
              +-------------------------+     |     +-------------------------+
              |                               |                               |
    +---------v--------+         +------------v----------+        +-----------v---------+
    |   IAM Service    |         | Risk Assessment       |        | Graph Intelligence  |
    |   :8081          |         | :8082                 |        | :8089               |
    |                  |         |                       |        |                     |
    | User Management  |         | Multi-dimensional     |        | Entity Resolution   |
    | RBAC             |         | Risk Scoring          |        | Relationship Maps   |
    | Token Blacklist  |         | Alert Engine          |        | Community Detection |
    +------------------+         +-----------------------+        +---------------------+
              |                               |                               |
    +---------v--------+         +------------v----------+        +-----------v---------+
    |   PostgreSQL     |         |   Redis               |        |   Kafka             |
    |   :5437          |         |   :6392               |        |   :9093             |
    +------------------+         +-----------------------+        +---------------------+
```

### Technology Stack

| Layer              | Technology                                                     |
|--------------------|----------------------------------------------------------------|
| **API Gateway**    | Go 1.21, Gin, JWT, Circuit Breaker, Rate Limiter               |
| **Backend**        | Go (Gin), Python (FastAPI)                                     |
| **Frontend**       | Next.js 14, TypeScript, Tailwind CSS                           |
| **Primary DB**     | PostgreSQL 15 (Alpine) with connection pooling                 |
| **Geospatial DB**  | PostGIS 15-3.3 (Alpine)                                        |
| **Cache**          | Redis 7 (Alpine) with LRU eviction, AOF persistence           |
| **Messaging**      | Apache Kafka (Confluent 7.5) with Zookeeper                   |
| **ML/AI**          | MLflow, XGBoost, LSTM, Transformers                            |
| **Observability**  | Prometheus, OpenTelemetry (OTLP/gRPC), Structured JSON Logging |
| **Infrastructure** | Docker, Docker Compose, Multi-stage Alpine builds              |

### Design Principles

- **Config-Driven Service Registry**: 29 backend services registered via environment variables with sensible defaults
- **Circuit Breaker Pattern**: Sony gobreaker protecting all inter-service communication
- **Graceful Degradation**: In-memory cache fallback when Redis is unavailable
- **Zero-Trust Security**: JWT + API Key + HMAC request signing layers
- **Non-Root Containers**: All Docker images run as unprivileged `appuser` (uid 1000)
- **Layered Architecture**: `cmd/` > `internal/api/` > `internal/application/` > `internal/domain/` > `internal/infrastructure/`

---

## Frontend Application

The ATLAS frontend is a Next.js 14 dashboard built with TypeScript, Tailwind CSS, and Recharts. It provides a comprehensive strategic intelligence interface with dark theme design.

### Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| **Command Center** | `/dashboard` | Real-time threat monitoring with KPI strip, incident trend charts, system status panel, active alerts with severity/category filtering, alert detail modals, and auto-refresh controls |
| **Analytics** | `/analytics` | Multi-dimensional threat analysis with 3 tabs (Overview, Trends, Breakdown), area/bar/pie/radar charts, time range filtering, CSV/JSON export |
| **Geospatial** | `/geospatial` | Interactive world map with 6 configurable layers (infrastructure, energy, supply chain, maritime, risk zones, satellites), asset markers, layer opacity controls, 2D/3D/satellite modes, timeline playback |
| **Simulations** | `/simulations` | Multi-step scenario wizard with 6+ templates, parameter configuration, Monte Carlo execution with real-time progress, impact analysis across 7 dimensions, timeline visualization, strategic recommendations |
| **Compliance** | `/compliance` | Regulatory tracking for GDPR, LGPD, SOC 2, ISO 27001, audit log table, data governance policies (encryption, retention, access control) |
| **Login** | `/login` | Secure authentication with form validation, error handling, demo credentials |

### Frontend Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.5 |
| **Styling** | Tailwind CSS 3.4 |
| **State** | Zustand 4.5 (auth, UI, dashboard, map, platform stores) |
| **Server State** | TanStack React Query 5.5 |
| **Charts** | Recharts 2.12 |
| **Animations** | Framer Motion 11.3 |
| **Dates** | date-fns 3.6 |

### Internationalization (i18n)

Full multi-language support with automatic browser detection and persistent preferences:

| Language | Locale | Status |
|----------|--------|--------|
| English | `en` | Complete |
| Portuguese (Brazil) | `pt-BR` | Complete |
| Spanish | `es` | Complete |

- Context-based translation system with `useI18n()` hook and `t()` function
- Nested key support (e.g., `t("dashboard.alerts.criticalInfra")`)
- Language switcher in the header with flag indicators
- LocalStorage persistence (`atlas-locale` key)
- Fallback to English for missing keys
- All 5 application pages fully internationalized

### Component Architecture

```
components/
├── atoms/          Button, Card, Badge, StatusBadge
├── molecules/      KPICard, Charts, AlertItem, RiskGauge
├── organisms/      Header (notifications, user menu, language switcher), Sidebar (navigation)
└── layouts/        MainLayout (sidebar + header + content)
```

### State Management (Zustand Stores)

| Store | Purpose |
|-------|---------|
| `useAuthStore` | User session, authentication state (localStorage persisted) |
| `useUIStore` | Sidebar toggle, theme, notifications |
| `useDashboardStore` | Time range, risk level filters, refresh interval |
| `useMapStore` | Map viewport, visible layers, selected feature |
| `usePlatformStore` | Service health status, last health check |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAlerts` | Alert management with filtering, acknowledgment, investigation, dismissal |
| `useAutoRefresh` | Configurable auto-refresh with countdown and manual trigger |
| `useAuth` | Authentication context (login, logout, user state) |
| `useI18n` | Translation function and locale management |

---

## Enterprise Features

### Authentication & Security

| Feature                    | Description                                                         |
|----------------------------|---------------------------------------------------------------------|
| JWT Authentication         | HMAC-SHA256 signed tokens with configurable expiration (default 1h) |
| Refresh Token Rotation     | Secure token renewal with 7-day refresh tokens                      |
| Token Blacklisting         | In-memory blacklist with background cleanup (30-min intervals)      |
| API Key Authentication     | SHA256-hashed keys with scopes, rate limits, and IP allowlists      |
| HMAC Request Signing       | `X-Request-Signature` with 5-minute replay window protection        |
| MFA Support                | Optional TOTP-based multi-factor authentication                     |
| Account Lockout            | Configurable max attempts (default 5) with lockout duration (15m)   |
| RBAC                       | Role-based access control (admin, analyst, viewer, operator)        |
| Permission System          | Granular resource:action permissions with wildcard support           |
| Password Policy            | Minimum length, special character requirements                      |

### Resilience & Performance

| Feature                | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| Circuit Breaker        | Per-service circuit breakers via Sony gobreaker (5 max failures, 30s)  |
| Rate Limiting          | Configurable RPS (default 100/s) + strict mode (20/min) for sensitive  |
| Response Caching       | SHA256-keyed GET response cache with Redis backend                     |
| Idempotency Keys       | 24-hour deduplication for POST/PUT/PATCH via `Idempotency-Key` header  |
| Connection Pooling     | HTTP: 100 max idle / 10 per host. PostgreSQL: 25 open / 10 idle       |
| Body Size Limiting     | 10MB max request body with `http.MaxBytesReader`                       |
| Gzip Compression       | Automatic response compression via `gin-contrib/gzip`                  |
| Graceful Shutdown      | Configurable timeout (default 30s) with concurrent server drain        |

### Observability

| Feature              | Description                                                     |
|----------------------|-----------------------------------------------------------------|
| Prometheus Metrics   | HTTP request duration, status codes, response sizes on `:9090`  |
| OpenTelemetry        | Distributed tracing via OTLP/gRPC (replaces deprecated Jaeger) |
| Structured Logging   | JSON logs via `zap` with request ID correlation                 |
| Request Tracing      | `X-Request-ID` + `X-Trace-ID` propagation across services      |
| Health Checks        | `/health`, `/healthz` (liveness), `/readyz` (readiness)        |
| Access Logging       | Full HTTP access log with latency, status, sizes               |

### Enterprise Middleware

| Feature              | Description                                                      |
|----------------------|------------------------------------------------------------------|
| Security Headers     | X-Frame-Options, CSP, HSTS, Permissions-Policy, Referrer-Policy  |
| CORS                 | Configurable origins, methods, headers, credentials              |
| API Versioning       | `API-Version` + `X-API-Version` response headers                 |
| Deprecation Warnings | `Sunset` + `Deprecation` headers for deprecated endpoints        |
| Sensitive Endpoints  | Enhanced logging + cache disabling for sensitive operations       |
| Request Timeout      | Per-request configurable timeout headers                         |
| JSON Normalization   | UTF-8 charset enforcement on all responses                       |

---

## Getting Started

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine + Compose (Linux)
- Git
- Minimum 8GB RAM, 20GB free disk space
- Go 1.21+ (for local development only)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/atlas-core-api.git
cd atlas-core-api

# Configure environment
cp .env.example .env
# Edit .env with your credentials (change JWT_SECRET for production)

# Start all services
docker compose up --build
```

### Service Endpoints

| Service              | URL                          | Description              |
|----------------------|------------------------------|--------------------------|
| Frontend             | `http://localhost:3004`      | Next.js dashboard        |
| API Gateway          | `http://localhost:8080`      | Main API entry point     |
| IAM Service          | `http://localhost:8084`      | Identity management      |
| Risk Assessment      | `http://localhost:8086`      | Risk scoring engine      |
| Graph Intelligence   | `http://localhost:8089`      | Relationship analysis    |
| Prometheus Metrics   | `http://localhost:9090`      | Gateway metrics          |
| PostgreSQL           | `localhost:5437`             | Primary database         |
| PostGIS              | `localhost:5438`             | Geospatial database      |
| Redis                | `localhost:6392`             | Cache & sessions         |
| Kafka                | `localhost:9093`             | Event streaming          |
| Zookeeper            | `localhost:2181`             | Kafka coordination       |

### Health Check

```bash
# Gateway health
curl http://localhost:8080/health

# Liveness probe (Kubernetes-compatible)
curl http://localhost:8080/healthz

# Readiness probe
curl http://localhost:8080/readyz
```

---

## API Reference

> **Complete API Manual**: For the full endpoint reference with request/response examples, SDK samples (cURL, JavaScript, Python), and integration guide, see **[docs/API_MANUAL.md](docs/API_MANUAL.md)**.

**Base URL**: `http://localhost:8080/api/v1`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

### Authentication

| Method | Endpoint               | Auth     | Description                    |
|--------|------------------------|----------|--------------------------------|
| POST   | `/auth/login`          | Public   | Login with username/password   |
| POST   | `/auth/register`       | Public   | Register new user account      |
| POST   | `/auth/refresh`        | Public   | Refresh access token           |
| GET    | `/auth/validate`       | Public   | Validate token                 |
| POST   | `/auth/logout`         | Bearer   | Logout (blacklists token)      |
| POST   | `/auth/change-password`| Bearer   | Change password (sensitive)    |

#### Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2024"}'
```

> **Demo Credentials**: `admin` / `Admin@2024` (password must be 8+ characters)

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@atlas.com",
    "roles": ["admin"]
  }
}
```

#### Register

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analyst01",
    "email": "analyst@atlas.com",
    "password": "SecurePass!123"
  }'
```

### User Management

| Method | Endpoint                       | Auth   | Description                |
|--------|--------------------------------|--------|----------------------------|
| GET    | `/users/me`                    | Bearer | Get current user profile   |
| GET    | `/users/:id`                   | Bearer | Get user by ID             |
| PUT    | `/users/:id`                   | Bearer | Update user (self or admin)|
| DELETE | `/users/:id`                   | Admin  | Delete user                |
| GET    | `/admin/users`                 | Admin  | List all users (paginated) |

### Role Management (Admin)

| Method | Endpoint                       | Auth  | Description                |
|--------|--------------------------------|-------|----------------------------|
| GET    | `/admin/roles`                 | Admin | List all roles             |
| POST   | `/admin/roles`                 | Admin | Create new role            |
| POST   | `/admin/users/:id/roles/:roleId`  | Admin | Assign role to user    |
| DELETE | `/admin/users/:id/roles/:roleId`  | Admin | Remove role from user  |

### Data Ingestion

| Method | Endpoint                         | Description                  |
|--------|----------------------------------|------------------------------|
| GET    | `/ingestion/sources`             | List data sources            |
| POST   | `/ingestion/sources`             | Create new source            |
| GET    | `/ingestion/sources/:id`         | Source details               |
| POST   | `/ingestion/sources/:id/data`    | Send data for ingestion      |
| POST   | `/ingestion/sources/:id/trigger` | Trigger manual ingestion     |
| GET    | `/ingestion/status`              | General ingestion status     |

### Data Normalization

| Method | Endpoint                           | Description             |
|--------|------------------------------------|-------------------------|
| GET    | `/normalization/rules`             | List normalization rules|
| POST   | `/normalization/rules`             | Create rule             |
| GET    | `/normalization/rules/:id`         | Rule details            |
| PUT    | `/normalization/rules/:id`         | Update rule             |
| DELETE | `/normalization/rules/:id`         | Remove rule             |
| GET    | `/normalization/quality/:data_id`  | Dataset quality metrics |
| GET    | `/normalization/stats`             | Aggregated statistics   |

### Risk Assessment

| Method | Endpoint                       | Description                   |
|--------|--------------------------------|-------------------------------|
| POST   | `/risks/assess`                | Assess entity risk            |
| GET    | `/risks/:id`                   | Get specific assessment       |
| GET    | `/risks/trends`                | Risk trends over time         |
| GET    | `/risks/entities/:entity_id`   | Assessments by entity         |
| POST   | `/risks/alerts`                | Configure risk alerts         |
| GET    | `/risks/profiles`              | Executive risk profiles       |

### Audit & Compliance

| Method | Endpoint                       | Description                |
|--------|--------------------------------|----------------------------|
| POST   | `/audit/events`                | Create audit event         |
| GET    | `/audit/logs`                  | List audit logs            |
| GET    | `/audit/logs/:id`              | Log details                |
| GET    | `/audit/compliance/report`     | Compliance report          |
| GET    | `/compliance/status`           | Consolidated compliance    |
| GET    | `/compliance/lineage/:id`      | Data lineage tracking      |

### ML Infrastructure

| Method | Endpoint                          | Description             |
|--------|-----------------------------------|-------------------------|
| GET    | `/ml/models`                      | List registered models  |
| POST   | `/ml/models`                      | Register model          |
| POST   | `/ml/models/:model_name/predict`  | Run prediction          |
| GET    | `/ml/experiments`                 | List experiments        |
| GET    | `/ml/health`                      | ML infrastructure health|

### NLP Services

| Method | Endpoint              | Description                  |
|--------|-----------------------|------------------------------|
| POST   | `/nlp/ner`            | Named Entity Recognition     |
| POST   | `/nlp/sentiment`      | Sentiment analysis           |
| POST   | `/nlp/classify`       | Text classification          |
| POST   | `/nlp/summarize`      | Document summarization       |

### Graph Intelligence

| Method | Endpoint                                | Description              |
|--------|-----------------------------------------|--------------------------|
| POST   | `/graph/entities/resolve`               | Entity resolution        |
| GET    | `/graph/entities/:id/relationships`     | Entity relationships     |
| GET    | `/graph/entities/:id/risk-propagation`  | Risk propagation paths   |
| GET    | `/graph/analytics/centrality`           | Centrality analysis      |
| GET    | `/graph/analytics/communities`          | Community detection      |

### Geospatial Intelligence

| Method | Endpoint                        | Description             |
|--------|---------------------------------|-------------------------|
| POST   | `/geospatial/query`             | Spatial query           |
| GET    | `/geospatial/zones`             | Zone/layer listing      |
| POST   | `/geospatial/context`           | Location context        |
| GET    | `/geospatial/supply-chains`     | Supply chain maps       |
| POST   | `/geospatial/supply-chains`     | Create supply chain map |

### OSINT & News

| Method | Endpoint              | Description                |
|--------|-----------------------|----------------------------|
| GET    | `/osint/analysis`     | OSINT analysis             |
| GET    | `/osint/signals`      | Intelligence signals       |
| GET    | `/news/articles`      | Aggregated news articles   |
| GET    | `/news/sources`       | News sources               |
| POST   | `/briefings/generate` | Generate executive briefing|

### Scenario Simulation

| Method | Endpoint                              | Description             |
|--------|---------------------------------------|-------------------------|
| POST   | `/simulations/scenarios`              | Create scenario         |
| GET    | `/simulations/:simulation_id`         | Get simulation results  |
| GET    | `/simulations/:simulation_id/results` | Detailed results        |
| POST   | `/simulations/compare`                | Compare scenarios       |

### Enterprise Endpoints

| Area             | Method | Endpoint                        | Description                |
|------------------|--------|---------------------------------|----------------------------|
| XAI              | POST   | `/xai/explain`                  | Explain model decision     |
| XAI              | POST   | `/xai/batch`                    | Batch explanations         |
| War-Gaming       | POST   | `/wargaming/scenarios`          | Create war-game scenario   |
| Digital Twins    | GET    | `/twins`                        | List digital twins         |
| Digital Twins    | POST   | `/twins`                        | Create digital twin        |
| Policy Impact    | POST   | `/policy/analyze`               | Policy impact analysis     |
| Multi-Region     | GET    | `/regions`                      | List regions               |
| Data Residency   | GET    | `/residency/policies`           | Data residency policies    |
| Federated ML     | POST   | `/federated/training/start`     | Start federated training   |
| Mobile API       | GET    | `/mobile/dashboard`             | Mobile dashboard data      |
| Compliance       | GET    | `/compliance/automation/status` | Automation status          |

### Platform Status

| Method | Endpoint                  | Description                           |
|--------|---------------------------|---------------------------------------|
| GET    | `/platform/status`        | Aggregated status of all services     |
| GET    | `/platform/services`      | List registered services              |

### Idempotency

For mutating operations (POST, PUT, PATCH), include an idempotency key:

```bash
curl -X POST http://localhost:8080/api/v1/risks/assess \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: unique-request-id-123" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "...", "entity_type": "organization"}'
```

Replayed responses include `X-Idempotent-Replayed: true`.

---

## Authentication & Authorization

### JWT Token Structure

```json
{
  "user_id": "uuid",
  "username": "admin",
  "email": "admin@atlas.com",
  "roles": ["admin"],
  "permissions": ["risk:read", "risk:write", "user:manage"],
  "mfa_verified": false,
  "exp": 1700000000,
  "iat": 1699996400
}
```

### Default Roles

| Role       | Description                             |
|------------|-----------------------------------------|
| `admin`    | Full system access, user management     |
| `analyst`  | Read/write access to analysis features  |
| `viewer`   | Read-only access                        |
| `operator` | Operational management access           |

### Default Permissions

| Permission              | Resource      | Action |
|-------------------------|---------------|--------|
| `risk:read`             | risk          | read   |
| `risk:write`            | risk          | write  |
| `user:read`             | user          | read   |
| `user:manage`           | user          | manage |
| `audit:read`            | audit         | read   |
| `data:ingest`           | data          | ingest |
| `model:predict`         | model         | predict|

### API Key Authentication

For service-to-service communication:

```bash
curl http://localhost:8080/api/v1/risks/trends \
  -H "X-API-Key: your-api-key-here"
```

### HMAC Request Signing

For high-security endpoints:

```bash
# Signature = HMAC-SHA256(secret, "{timestamp}.{path}.{body}")
curl http://localhost:8080/api/v1/risks/assess \
  -H "X-Request-Signature: <hmac-signature>" \
  -H "X-Request-Timestamp: <unix-timestamp>"
```

---

## Service Registry

The API Gateway proxies requests to 29 backend services via a config-driven registry. Each service URL is configurable via environment variables.

| Service                      | Internal URL                           | Env Override                              |
|------------------------------|----------------------------------------|-------------------------------------------|
| IAM Service                  | `http://iam-service:8081`              | `SERVICE_IAM_SERVICE_URL`                 |
| Risk Assessment              | `http://risk-assessment:8082`          | `SERVICE_RISK_ASSESSMENT_URL`             |
| News Aggregator              | `http://news-aggregator:8083`          | `SERVICE_NEWS_AGGREGATOR_URL`             |
| Ingestion Service            | `http://ingestion-service:8084`        | `SERVICE_INGESTION_SERVICE_URL`           |
| Normalization Service        | `http://normalization-service:8085`    | `SERVICE_NORMALIZATION_SERVICE_URL`       |
| Audit Service                | `http://audit-logging:8086`            | `SERVICE_AUDIT_SERVICE_URL`              |
| ML Infrastructure            | `http://ml-infrastructure:8087`        | `SERVICE_ML_INFRASTRUCTURE_URL`           |
| NLP Service                  | `http://nlp-service:8088`              | `SERVICE_NLP_SERVICE_URL`                 |
| Graph Intelligence           | `http://graph-intelligence:8089`       | `SERVICE_GRAPH_INTELLIGENCE_URL`          |
| XAI Service                  | `http://xai-service:8090`              | `SERVICE_XAI_SERVICE_URL`                 |
| Model Serving                | `http://model-serving:8091`            | `SERVICE_MODEL_SERVING_URL`               |
| Model Monitoring             | `http://model-monitoring:8092`         | `SERVICE_MODEL_MONITORING_URL`            |
| Scenario Simulation          | `http://scenario-simulation:8093`      | `SERVICE_SCENARIO_SIMULATION_URL`         |
| War-Gaming                   | `http://war-gaming:8094`               | `SERVICE_WAR_GAMING_URL`                  |
| Digital Twins                | `http://digital-twins:8095`            | `SERVICE_DIGITAL_TWINS_URL`               |
| Policy Impact                | `http://policy-impact:8096`            | `SERVICE_POLICY_IMPACT_URL`               |
| Multi-Region                 | `http://multi-region:8097`             | `SERVICE_MULTI_REGION_URL`                |
| Data Residency               | `http://data-residency:8098`           | `SERVICE_DATA_RESIDENCY_URL`              |
| Federated Learning           | `http://federated-learning:8099`       | `SERVICE_FEDERATED_LEARNING_URL`          |
| Mobile API                   | `http://mobile-api:8100`               | `SERVICE_MOBILE_API_URL`                  |
| Compliance Automation        | `http://compliance-automation:8101`    | `SERVICE_COMPLIANCE_AUTOMATION_URL`       |
| Performance Optimization     | `http://performance-optimization:8102` | `SERVICE_PERFORMANCE_OPTIMIZATION_URL`    |
| Cost Optimization            | `http://cost-optimization:8103`        | `SERVICE_COST_OPTIMIZATION_URL`           |
| Advanced R&D                 | `http://advanced-rd:8104`              | `SERVICE_ADVANCED_RD_URL`                 |
| Security Certification       | `http://security-certification:8105`   | `SERVICE_SECURITY_CERTIFICATION_URL`      |
| Continuous Improvement       | `http://continuous-improvement:8106`   | `SERVICE_CONTINUOUS_IMPROVEMENT_URL`      |
| Entity Service               | `http://entity-service:8107`           | `SERVICE_ENTITY_SERVICE_URL`              |
| Geospatial Service           | `http://geospatial-service:8108`       | `SERVICE_GEOSPATIAL_SERVICE_URL`          |
| Intelligence Service         | `http://intelligence-service:8109`     | `SERVICE_INTELLIGENCE_SERVICE_URL`        |

---

## Database Schema

### Core Tables (Migration 000001)

```sql
-- IAM
users (id UUID PK, username UNIQUE, email UNIQUE, password_hash, is_active, is_verified, last_login_at)
roles (id UUID PK, name UNIQUE, description)
permissions (id UUID PK, name UNIQUE, resource, action, description)
user_roles (user_id FK, role_id FK, composite PK)
role_permissions (role_id FK, permission_id FK)

-- Risk Assessment
risk_assessments (id UUID PK, entity_id, entity_type, overall_score, operational_score,
                  financial_score, reputational_score, geopolitical_score, compliance_score)
risk_alerts (id UUID PK, assessment_id FK, severity ENUM, is_resolved, resolved_by)

-- Audit & Compliance
audit_logs (id UUID PK, user_id, action, resource, resource_id, ip_address, user_agent, details JSONB)
compliance_events (id UUID PK, event_type, regulation, status, evidence JSONB)

-- Data Ingestion
data_sources (id UUID PK, name UNIQUE, source_type, config JSONB, is_active)
ingestion_runs (id UUID PK, source_id FK, status, records_processed, records_failed, error_message)
```

### Enterprise Tables (Migration 000003)

```sql
-- API Key Management
api_keys (id UUID PK, key_hash UNIQUE, key_prefix, owner_id FK, scopes TEXT[],
          rate_limit_rps, allowed_ips TEXT[], expires_at)

-- Token & Session Management
token_blacklist (id UUID PK, token_hash, user_id FK, reason, expires_at)
login_attempts (id UUID PK, username, ip_address, success BOOL, user_agent, failure_reason)
user_sessions (id UUID PK, user_id FK, token_hash, ip_address, device_info JSONB, expires_at)

-- Webhook System
webhook_subscriptions (id UUID PK, url, secret, events TEXT[], owner_id FK, retry_count, timeout_seconds)
webhook_deliveries (id UUID PK, subscription_id FK, event_type, payload JSONB, response_status, success)

-- Feature Flags
feature_flags (id UUID PK, name UNIQUE, is_enabled, rules JSONB, rollout_percentage 0-100, created_by FK)
```

### Geospatial Tables (Migration 000002)

PostGIS-enabled tables for spatial queries, zone management, and supply chain geographic mapping.

### Seed Data

The initial migration seeds:
- **4 roles**: admin, analyst, viewer, operator
- **7 permissions**: risk:read, risk:write, user:read, user:manage, audit:read, data:ingest, model:predict
- **Admin user**: `admin` / `admin@atlas.com`

---

## Middleware Pipeline

Requests flow through the following middleware chain in order:

```
Request
  |
  v
[1] Recovery (panic handler with structured logging)
  |
[2] Request ID (UUID generation, X-Request-ID header)
  |
[3] Trace Context (X-Trace-ID propagation)
  |
[4] Logger (structured access log with latency, status, sizes)
  |
[5] Security Headers (X-Frame-Options, CSP, HSTS, etc.)
  |
[6] JSON Normalization (UTF-8 charset enforcement)
  |
[7] Version Header (API-Version, X-API-Version)
  |
[8] CORS (configurable origins, methods, credentials)
  |
[9] Rate Limiter (token bucket, configurable RPS)
  |
[10] Body Size Limit (10MB max)
  |
[11] Gzip Compression
  |
  +-- PUBLIC ROUTES (login, register, refresh, validate, health)
  |
  +-- PROTECTED ROUTES
        |
        [12] JWT Authentication (Bearer token validation)
        |
        [13] Idempotency Key (24h deduplication for mutations)
        |
        [14] Circuit Breaker (per-service, 5 failures / 30s timeout)
        |
        v
      Handler -> Service Proxy -> Backend Service
```

---

## Observability

### Prometheus Metrics

Available at `http://localhost:9090/metrics`:

- `http_requests_total` - Total HTTP requests by method, path, status
- `http_request_duration_seconds` - Request latency histogram
- `http_response_size_bytes` - Response size histogram

### Structured Logging

All services use `zap` for structured JSON logging:

```json
{
  "level": "info",
  "msg": "HTTP Request",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "status": 200,
  "latency": "12.345ms",
  "ip": "172.28.0.1",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_size": 64,
  "response_size": 512
}
```

### Distributed Tracing

OpenTelemetry with OTLP/gRPC exporter (configurable):

```bash
TRACING_ENABLED=true
JAEGER_ENDPOINT=localhost:4317  # OTLP gRPC endpoint
TRACING_SAMPLING_FRACTION=0.1
```

### Health Checks

Every service implements Docker health checks:

| Endpoint   | Purpose                              |
|------------|--------------------------------------|
| `/health`  | Full health with dependency checks   |
| `/healthz` | Kubernetes liveness probe            |
| `/readyz`  | Kubernetes readiness probe           |

---

## Configuration Reference

All configuration is managed via environment variables. See `.env.example` for the complete reference.

### Critical Settings

| Variable              | Default                  | Description                          |
|-----------------------|--------------------------|--------------------------------------|
| `ENVIRONMENT`         | `development`            | Environment (development/production) |
| `JWT_SECRET`          | `change-me-in-production`| **Must change in production**        |
| `POSTGRES_PASSWORD`   | `atlas_dev`              | Database password                    |
| `SERVER_PORT`         | `8080`                   | API Gateway port                     |

### Server

| Variable                  | Default | Description            |
|---------------------------|---------|------------------------|
| `SERVER_HOST`             | `0.0.0.0` | Bind address        |
| `SERVER_READ_TIMEOUT`     | `30s`   | Read timeout           |
| `SERVER_WRITE_TIMEOUT`    | `30s`   | Write timeout          |
| `SERVER_IDLE_TIMEOUT`     | `120s`  | Idle timeout           |
| `SERVER_SHUTDOWN_TIMEOUT` | `30s`   | Graceful shutdown      |
| `SERVER_GRACEFUL_SHUTDOWN`| `true`  | Enable graceful shutdown|

### Authentication

| Variable                   | Default | Description                |
|----------------------------|---------|----------------------------|
| `JWT_EXPIRATION`           | `15m`   | Access token TTL           |
| `REFRESH_TOKEN_EXPIRATION` | `168h`  | Refresh token TTL (7 days) |
| `MAX_LOGIN_ATTEMPTS`       | `5`     | Max failed login attempts  |
| `LOCKOUT_DURATION`         | `15m`   | Account lockout duration   |
| `PASSWORD_MIN_LENGTH`      | `8`     | Minimum password length    |
| `PASSWORD_REQUIRE_SPECIAL` | `true`  | Require special characters |
| `MFA_REQUIRED`             | `false` | Enforce MFA                |

### Cache

| Variable              | Default                  | Description              |
|-----------------------|--------------------------|--------------------------|
| `CACHE_TYPE`          | `redis`                  | Cache backend            |
| `CACHE_TTL`           | `1h`                     | Default cache TTL        |
| `REDIS_URL`           | `redis://localhost:6392` | Redis connection URL     |
| `CACHE_MAX_SIZE`      | `1000`                   | Max in-memory entries    |
| `CACHE_EVICTION_POLICY`| `lru`                   | Eviction policy          |

### Rate Limiting

| Variable           | Default | Description              |
|--------------------|---------|--------------------------|
| `RATE_LIMIT_ENABLED`| `true` | Enable rate limiting     |
| `RATE_LIMIT_RPS`   | `100`   | Requests per second      |
| `RATE_LIMIT_BURST` | `50`    | Burst allowance          |

### CORS

| Variable                | Default                              | Description            |
|-------------------------|--------------------------------------|------------------------|
| `CORS_ENABLED`          | `true`                               | Enable CORS            |
| `CORS_ALLOWED_ORIGINS`  | `http://localhost:3004`              | Allowed origins (CSV)  |
| `CORS_ALLOWED_METHODS`  | `GET,POST,PUT,DELETE,OPTIONS`        | Allowed methods (CSV)  |
| `CORS_ALLOW_CREDENTIALS`| `true`                               | Allow credentials      |
| `CORS_MAX_AGE`          | `86400`                              | Preflight cache (sec)  |

### Database

| Variable               | Default     | Description               |
|------------------------|-------------|---------------------------|
| `DATABASE_URL`         | (composed)  | Full PostgreSQL URL       |
| `DATABASE_MAX_CONNECTIONS`| `25`     | Max open connections      |
| `DATABASE_MIN_CONNECTIONS`| `5`      | Min idle connections      |
| `DATABASE_SSLMODE`     | `disable`   | SSL mode                  |
| `DATABASE_LOG_QUERIES` | `false`     | Log SQL queries           |

---

## Project Structure

```
atlas-core-api/
|-- docker-compose.yml              # Service orchestration
|-- .env.example                    # Environment configuration template
|-- README.md                       # This file
|-- migrations/
|   |-- 000001_init_schema.up.sql   # Core tables (IAM, risk, audit, ingestion)
|   |-- 000002_geospatial.up.sql    # PostGIS extensions
|   |-- 000003_enterprise_features.up.sql  # API keys, sessions, webhooks, flags
|
|-- services/
|   |-- api-gateway/                # API Gateway (Go, Gin) - :8080
|   |   |-- cmd/main.go
|   |   |-- internal/
|   |   |   |-- api/
|   |   |   |   |-- handlers/       # Auth, health check handlers
|   |   |   |   |-- middleware/      # Auth, cache, CORS, rate limit, idempotency, security
|   |   |   |   |-- router/         # Config-driven route registry (29 services)
|   |   |   |-- infrastructure/
|   |   |       |-- cache/           # Redis + in-memory cache
|   |   |       |-- config/          # Environment-based configuration
|   |   |       |-- observability/
|   |   |       |   |-- metrics/     # Prometheus instrumentation
|   |   |       |   |-- tracing/     # OpenTelemetry OTLP/gRPC
|   |   |       |-- resilience/
|   |   |           |-- circuitbreaker/  # Sony gobreaker pool
|   |   |-- Dockerfile
|   |
|   |-- iam/                        # Identity & Access Management (Go) - :8081
|   |   |-- cmd/main.go
|   |   |-- internal/
|   |   |   |-- api/handlers/       # Auth, user, role handlers
|   |   |   |-- api/middleware/      # JWT auth, role/permission guards
|   |   |   |-- application/        # AuthService, UserService
|   |   |   |-- domain/             # User, Role entities
|   |   |   |-- infrastructure/     # Repository, config
|   |   |-- Dockerfile
|   |
|   |-- risk-assessment/            # Risk Assessment (Go) - :8082
|   |-- ingestion/                  # Data Ingestion (Go) + Kafka
|   |-- normalization/              # Data Normalization (Go) + Kafka
|   |-- audit-logging/              # Audit Logging (Go) + Kafka
|   |-- graph-intelligence/         # Graph Intelligence (Go) - :8089
|   |-- frontend/                   # Next.js 14 Dashboard - :3000
|   |   |-- src/
|   |   |   |-- app/                # Pages (dashboard, analytics, geospatial, simulations, compliance, login)
|   |   |   |-- components/        # Atoms, Molecules, Organisms, Layouts
|   |   |   |-- contexts/          # AuthContext (JWT session management)
|   |   |   |-- hooks/             # useAlerts, useAutoRefresh
|   |   |   |-- i18n/              # Internationalization (en, pt-BR, es)
|   |   |   |-- services/api/      # API client & endpoint modules
|   |   |   |-- store/             # Zustand stores (auth, UI, dashboard, map, platform)
|   |   |   |-- types/             # TypeScript definitions
|   |   |   |-- utils/             # Utility functions (formatDate, etc.)
|   |   |-- Dockerfile
|   |
|   |-- ml-infrastructure/          # ML Pipeline (Python)
|   |-- nlp-service/                # NLP Processing (Python)
|   |-- xai-service/                # Explainable AI (Python)
|   |-- model-serving/              # Model Serving (Python)
|   |-- model-monitoring/           # Model Monitoring (Python)
|   |-- scenario-simulation/        # Monte Carlo Simulation (Python)
|   |-- war-gaming/                 # War-Gaming Engine (Python)
|   |-- digital-twins/              # Digital Twins (Python)
|   |-- policy-impact/              # Policy Impact Analysis (Python)
|   |-- multi-region/               # Multi-Region Controller (Python)
|   |-- data-residency/             # Data Residency (Python)
|   |-- federated-learning/         # Federated Learning (Python)
|   |-- mobile-api/                 # Mobile API (Python)
|   |-- compliance-automation/      # Compliance Automation (Python)
|   |-- performance-optimization/   # Performance Optimization (Python)
|   |-- cost-optimization/          # Cost Optimization (Python)
|   |-- advanced-rd/                # Advanced R&D (Python)
|   |-- security-certification/     # Security Certification (Python)
|   |-- continuous-improvement/     # Continuous Improvement (Python)
|
|-- docs/
|   |-- API_MANUAL.md                 # Complete API endpoint reference
|   |-- PHASE_1_MVP.md
|   |-- PHASE_2_ANALYTICS.md
|   |-- PHASE_3_DECISION_SUPPORT.md
|   |-- PHASE_4_STRATEGIC_PLATFORM.md
|   |-- PHASE_5_OPTIMIZATION.md
|   |-- AI_ML_STRATEGY.md
```

---

## Troubleshooting

### Port Conflicts

The default ports are chosen to avoid common conflicts. If you have services running on these ports, update `docker-compose.yml`:

| Service    | Default Host Port | Container Port |
|------------|-------------------|----------------|
| PostgreSQL | 5437              | 5432           |
| PostGIS    | 5438              | 5432           |
| Redis      | 6392              | 6379           |
| API Gateway| 8080              | 8080           |
| IAM        | 8084              | 8081           |
| Risk       | 8086              | 8082           |
| Graph Intel| 8089              | 8089           |
| Frontend   | 3004              | 3000           |
| Kafka      | 9093              | 9092           |
| Zookeeper  | 2181              | 2181           |
| Metrics    | 9090              | 9090           |

To check which ports are in use:

```bash
# Windows
netstat -ano | findstr LISTENING

# Linux/Mac
sudo lsof -i -P -n | grep LISTEN
```

### Docker Build Errors

```bash
# Clean Go module cache for a specific service
cd services/<service-name>
go clean -modcache
go mod tidy
go build ./...

# Full Docker rebuild
docker compose down -v
docker builder prune -a -f
docker compose up --build
```

### Service Communication Issues

```bash
# Check service status
docker compose ps

# View service logs
docker compose logs -f <service-name>

# Check network connectivity
docker compose exec api-gateway wget -q --spider http://iam-service:8081/health

# Verify all services are on the same network
docker network inspect atlas-core-api_atlas-network
```

### Database Issues

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U atlas -d atlas

# Run migrations manually
docker compose exec postgres psql -U atlas -d atlas -f /docker-entrypoint-initdb.d/000001_init_schema.up.sql

# Check database health
docker compose exec postgres pg_isready -U atlas -d atlas
```

### Redis Cache Issues

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli -p 6379

# Check Redis health
docker compose exec redis redis-cli ping

# Flush cache (development only)
docker compose exec redis redis-cli FLUSHALL
```

---

## Roadmap

### Phase 1 -- Foundation & Core Services (Current)
- Data Ingestion, Normalization, Risk Assessment, Audit Logging
- IAM with RBAC, JWT authentication, token blacklisting
- API Gateway with enterprise middleware pipeline
- PostgreSQL, Redis, Kafka infrastructure

### Phase 2 -- Enhanced Analytics
- ML Infrastructure with MLflow experiment tracking
- NLP Service (NER, Sentiment, Classification, Summarization)
- Graph Intelligence (centrality, communities, risk propagation)
- Explainable AI (XAI) with batch processing
- Model Serving & Monitoring with drift detection

### Phase 3 -- Decision Support
- Scenario Simulation (Monte Carlo, agent-based modeling)
- Defensive War-Gaming engine
- Digital Twins of infrastructure and supply chains
- Policy Impact Analysis

### Phase 4 -- Strategic Platform
- Multi-Region Architecture
- Data Residency Controls
- Federated Learning
- Mobile API
- Compliance Automation

### Phase 5 -- Optimization & Certification
- Performance Optimization
- Cost Optimization
- Security Certification (ISO 27001, SOC 2)
- Advanced R&D
- Continuous Improvement

---

## Project Statistics

| Metric                       | Value     |
|------------------------------|-----------|
| Total Microservices          | 29        |
| Go Services (Refactored)     | 7         |
| Python Services              | 17+       |
| Frontend Pages               | 6         |
| API Endpoints                | 150+      |
| Database Tables              | 27        |
| Database Migrations          | 3         |
| Middleware Components        | 14        |
| Service Registry Entries     | 29        |
| Docker Containers            | 35+       |
| Supported Languages (i18n)   | 3 (EN, PT-BR, ES) |
| Translation Keys             | 400+      |
| Primary Languages            | Go, Python, TypeScript |

---

## Security

### Implemented Controls

- **Authentication**: JWT (HMAC-SHA256) + API Keys + HMAC Request Signing
- **Authorization**: RBAC with granular permissions and wildcard support
- **Transport**: TLS-ready (configurable), HSTS headers
- **Headers**: CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy
- **Rate Limiting**: Per-IP token bucket + strict mode for sensitive endpoints
- **Input Validation**: Body size limits, JSON normalization
- **Token Security**: Blacklisting, rotation, configurable expiration
- **Account Protection**: Lockout after failed attempts, login attempt logging
- **Container Security**: Non-root users, Alpine base images, multi-stage builds
- **Audit Trail**: Immutable audit logging with JSONB detail storage

### Production Checklist

- [ ] Change `JWT_SECRET` to a 64-character random string
- [ ] Change `POSTGRES_PASSWORD` to a strong password
- [ ] Enable `TLS_ENABLED=true` with valid certificates
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure `CORS_ALLOWED_ORIGINS` to your domain
- [ ] Enable `MFA_REQUIRED=true` for admin accounts
- [ ] Set `TRACING_SAMPLING_FRACTION` to 0.01-0.1
- [ ] Configure proper `ALLOWED_ORIGINS` for security headers
- [ ] Review and restrict API key scopes and IP allowlists
- [ ] Set up Prometheus alerting rules
- [ ] Configure log aggregation (ELK/Loki)
- [ ] Enable database SSL (`DATABASE_SSLMODE=require`)

---

## Testing

```bash
# Run Go tests for a specific service
cd services/api-gateway
go test ./...

# Run all Go services tests
for svc in api-gateway iam risk-assessment ingestion normalization audit-logging graph-intelligence; do
  echo "Testing $svc..."
  cd services/$svc && go test ./... && cd ../..
done

# Run Python tests
cd services/nlp-service
pytest -v

# Integration test (requires running services)
curl -s http://localhost:8080/health | jq .
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Follow the layered architecture pattern (`cmd/` > `api/` > `application/` > `domain/` > `infrastructure/`)
4. Write tests for new functionality
5. Make small, well-described commits
6. Open a Pull Request with clear description (scope, motivation, tests)

---

## License

Licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

**ATLAS** -- Strategic Intelligence Platform | Enterprise-Grade Architecture
