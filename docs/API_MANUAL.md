# ATLAS API Manual

**Version 2.0.0** | Complete Endpoint Reference & Integration Guide

---

## Table of Contents

- [Introduction](#introduction)
- [Base URL & Authentication](#base-url--authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Idempotency](#idempotency)
- [Endpoints](#endpoints)
  - [Health & Status](#health--status)
  - [Authentication](#authentication)
  - [User Management](#user-management)
  - [Role Management](#role-management)
  - [Risk Assessment](#risk-assessment)
  - [Risk Profiles & Alerts](#risk-profiles--alerts)
  - [Data Ingestion](#data-ingestion)
  - [Data Normalization](#data-normalization)
  - [Audit & Compliance](#audit--compliance)
  - [Graph Intelligence](#graph-intelligence)
  - [Geospatial Intelligence](#geospatial-intelligence)
  - [OSINT & News](#osint--news)
  - [Scenario Simulation](#scenario-simulation)
  - [War-Gaming](#war-gaming)
  - [ML Infrastructure](#ml-infrastructure)
  - [NLP Services](#nlp-services)
  - [Explainable AI (XAI)](#explainable-ai-xai)
  - [Model Serving & Monitoring](#model-serving--monitoring)
  - [Digital Twins](#digital-twins)
  - [Policy Impact](#policy-impact)
  - [Multi-Region & Data Residency](#multi-region--data-residency)
  - [Federated Learning](#federated-learning)
  - [Mobile API](#mobile-api)
  - [Compliance Automation](#compliance-automation)
  - [Performance & Cost Optimization](#performance--cost-optimization)
  - [Security Certification](#security-certification)
  - [Advanced R&D](#advanced-rd)
  - [Continuous Improvement](#continuous-improvement)
  - [Platform Overview](#platform-overview)
  - [Strategic Entities](#strategic-entities)
- [WebSocket Events](#websocket-events)
- [SDK Examples](#sdk-examples)

---

## Introduction

The ATLAS API is a RESTful API that provides access to the Strategic Intelligence Platform. All endpoints are routed through a centralized API Gateway that handles authentication, rate limiting, circuit breaking, and request proxying to downstream microservices.

### Architecture

```
Client → API Gateway (:8080) → [Auth + Middleware] → Backend Service
```

The API Gateway proxies requests to 29 registered backend services with circuit breaker protection, connection pooling, and distributed tracing.

---

## Base URL & Authentication

### Base URL

```
http://localhost:8080/api/v1
```

### Authentication Methods

#### 1. JWT Bearer Token (Primary)

```bash
curl -X GET http://localhost:8080/api/v1/risks/trends \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

#### 2. API Key

```bash
curl -X GET http://localhost:8080/api/v1/risks/trends \
  -H "X-API-Key: your-api-key-here"
```

#### 3. HMAC Request Signing (High Security)

```bash
# Signature = HMAC-SHA256(secret, "{timestamp}.{path}.{body}")
curl -X POST http://localhost:8080/api/v1/risks/assess \
  -H "X-Request-Signature: <hmac-signature>" \
  -H "X-Request-Timestamp: <unix-timestamp>"
```

### Obtaining a Token

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2024"}'
```

---

## Response Format

All responses follow a consistent JSON structure:

### Success Response

```json
{
  "data": { ... },
  "meta": {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Paginated Response

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Response Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Unique request identifier for tracing |
| `X-Trace-ID` | Distributed trace identifier |
| `API-Version` | Current API version (2.0.0) |
| `X-RateLimit-Limit` | Rate limit ceiling |
| `X-RateLimit-Remaining` | Remaining requests in window |

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": "Token has expired at 2025-01-15T10:30:00Z",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `204` | No Content (successful delete) |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `413` | Payload Too Large (>10MB) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |
| `503` | Service Unavailable (circuit breaker open) |

---

## Rate Limiting

| Tier | Limit | Burst |
|------|-------|-------|
| Standard | 100 req/s | 50 |
| Sensitive Endpoints | 20 req/min | 5 |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000060
```

---

## Idempotency

For mutating operations (`POST`, `PUT`, `PATCH`), include an idempotency key to prevent duplicate processing:

```bash
curl -X POST http://localhost:8080/api/v1/risks/assess \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: unique-request-id-123" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "...", "entity_type": "organization"}'
```

- Keys are valid for **24 hours**
- Replayed responses include `X-Idempotent-Replayed: true`

---

## Endpoints

### Health & Status

These endpoints do **not** require authentication.

#### `GET /health`
Full health check with dependency status.

```bash
curl http://localhost:8080/health
```

```json
{
  "status": "healthy",
  "service": "api-gateway",
  "version": "2.0.0",
  "dependencies": {
    "postgres": "healthy",
    "redis": "healthy"
  }
}
```

#### `GET /healthz`
Kubernetes liveness probe. Returns `200` if the process is alive.

#### `GET /readyz`
Kubernetes readiness probe. Returns `200` if the service is ready to accept traffic.

---

### Authentication

#### `POST /api/v1/auth/login`

Authenticate with username and password. Returns JWT tokens.

**Auth:** Public

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@2024"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "admin",
    "email": "admin@atlas.com",
    "roles": ["admin"]
  }
}
```

> **Brute Force Protection:** Account locks after 5 failed attempts for 15 minutes.

> **Demo Credentials:** `admin` / `Admin@2024`

#### `POST /api/v1/auth/register`

Register a new user account.

**Auth:** Public

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analyst01",
    "email": "analyst@atlas.com",
    "password": "SecurePass!123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "username": "analyst01",
  "email": "analyst@atlas.com"
}
```

#### `POST /api/v1/auth/refresh`

Refresh an expired access token using a valid refresh token.

**Auth:** Public

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}'
```

#### `GET /api/v1/auth/validate`

Validate if a token is still valid.

**Auth:** Public

```bash
curl http://localhost:8080/api/v1/auth/validate \
  -H "Authorization: Bearer <token>"
```

#### `POST /api/v1/auth/logout`

Logout and blacklist the current token.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer <token>"
```

#### `POST /api/v1/auth/change-password`

Change the current user's password. This is a **sensitive endpoint** with enhanced audit logging.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "OldPass!123",
    "new_password": "NewPass!456"
  }'
```

---

### User Management

#### `GET /api/v1/users/me`

Get the current authenticated user's profile.

**Auth:** Bearer

```bash
curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

#### `GET /api/v1/users/:id`

Get a specific user by ID.

**Auth:** Bearer

#### `PUT /api/v1/users/:id`

Update a user profile. Users can update their own profile; admins can update any user.

**Auth:** Bearer

```bash
curl -X PUT http://localhost:8080/api/v1/users/<user-id> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Updated"
  }'
```

#### `GET /api/v1/users` (Admin)

List all users with pagination.

**Auth:** Admin role required

```bash
curl "http://localhost:8080/api/v1/users?page=1&limit=20" \
  -H "Authorization: Bearer <admin-token>"
```

#### `DELETE /api/v1/users/:id` (Admin)

Soft-delete a user account.

**Auth:** Admin role required

---

### Role Management

All role management endpoints require **Admin** role.

#### `GET /api/v1/roles`

List all available roles.

#### `POST /api/v1/roles`

Create a new role.

```bash
curl -X POST http://localhost:8080/api/v1/roles \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "senior_analyst",
    "description": "Senior risk analyst with elevated access"
  }'
```

#### `POST /api/v1/users/:id/roles/:roleId`

Assign a role to a user.

#### `DELETE /api/v1/users/:id/roles/:roleId`

Remove a role from a user.

### Default Roles

| Role | Description |
|------|-------------|
| `admin` | Full system access, user management |
| `analyst` | Read/write access to analysis features |
| `viewer` | Read-only access |
| `operator` | Operational management access |

### Default Permissions

| Permission | Resource | Action |
|------------|----------|--------|
| `read:risks` | risk | read |
| `write:risks` | risk | write |
| `delete:risks` | risk | delete |
| `read:users` | user | read |
| `write:users` | user | write |
| `read:audit` | audit | read |
| `admin:all` | all | all |

---

### Risk Assessment

#### `POST /api/v1/risks/assess`

Perform a multi-dimensional risk assessment on an entity.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/risks/assess \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "entity-uuid",
    "entity_type": "organization",
    "dimensions": ["operational", "financial", "geopolitical", "compliance", "reputational"],
    "time_horizon": "90d",
    "include_factors": true,
    "include_trends": true
  }'
```

**Response:**
```json
{
  "id": "assessment-uuid",
  "entity_id": "entity-uuid",
  "overall_score": 72.5,
  "confidence": 0.89,
  "dimensions": {
    "operational": {"score": 65.0, "trend": "stable", "weight": 0.25},
    "financial": {"score": 78.0, "trend": "increasing", "weight": 0.20},
    "reputational": {"score": 55.0, "trend": "decreasing", "weight": 0.15},
    "geopolitical": {"score": 82.0, "trend": "increasing", "weight": 0.25},
    "compliance": {"score": 70.0, "trend": "stable", "weight": 0.15}
  },
  "factors": [
    {"id": "f1", "name": "Regulatory Change", "impact": 8.5, "source": "compliance_api"},
    {"id": "f2", "name": "Market Volatility", "impact": 7.2, "source": "financial_api"}
  ],
  "timestamp": "2025-01-15T10:30:00Z",
  "valid_until": "2025-01-16T10:30:00Z"
}
```

#### `GET /api/v1/risks/:id`

Get a specific risk assessment by ID.

**Auth:** Bearer

#### `GET /api/v1/risks/trends`

Get risk trends over time for an entity.

**Auth:** Bearer

```bash
curl "http://localhost:8080/api/v1/risks/trends?entity_id=<uuid>&dimension=geopolitical&period=30d" \
  -H "Authorization: Bearer <token>"
```

#### `GET /api/v1/risks/entities/:entity_id`

Get all risk assessments for a specific entity.

**Auth:** Bearer

#### `POST /api/v1/risks/alerts`

Configure a risk alert threshold.

**Auth:** Bearer

#### `GET /api/v1/risks/profiles`

Get executive risk profiles.

**Auth:** Bearer

---

### Risk Profiles & Alerts

#### `GET /api/v1/risk-profiles`

List all risk profiles.

#### `GET /api/v1/risk-profiles/:id`

Get a specific risk profile.

#### `POST /api/v1/risk-profiles`

Create a new risk profile.

---

### Data Ingestion

#### `GET /api/v1/ingestion/sources`

List all registered data sources.

**Auth:** Bearer

```bash
curl http://localhost:8080/api/v1/ingestion/sources \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "data": [
    {
      "id": "source-uuid",
      "name": "Reuters News Feed",
      "type": "news_api",
      "status": "active",
      "last_sync": "2025-01-15T09:00:00Z",
      "config": { "url": "https://...", "interval": "15m" }
    }
  ]
}
```

#### `POST /api/v1/ingestion/sources`

Register a new data source.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/ingestion/sources \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACLED Conflict Data",
    "type": "licensed",
    "config": {
      "url": "https://api.acleddata.com/acled/read",
      "api_key": "your-key",
      "interval": "1h"
    }
  }'
```

**Supported Source Types:** `news_api`, `rss`, `manual`, `synthetic`, `licensed`

#### `GET /api/v1/ingestion/sources/:id`

Get details for a specific data source.

#### `POST /api/v1/ingestion/sources/:id/data`

Submit data directly to a source for ingestion.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/ingestion/sources/<id>/data \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {"title": "Event Report", "content": "...", "timestamp": "2025-01-15T10:00:00Z"}
    ]
  }'
```

#### `POST /api/v1/ingestion/sources/:id/trigger`

Manually trigger an ingestion run for a data source.

#### `GET /api/v1/ingestion/status`

Get the overall ingestion pipeline status.

---

### Data Normalization

#### `GET /api/v1/normalization/rules`

List all normalization rules.

**Auth:** Bearer

#### `POST /api/v1/normalization/rules`

Create a new normalization rule.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/normalization/rules \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Date Standardization",
    "field": "event_date",
    "type": "date",
    "config": {"format": "ISO8601"},
    "priority": 1,
    "active": true
  }'
```

**Rule Types:** `date`, `currency`, `location`, `entity`, `format`

#### `GET /api/v1/normalization/rules/:id`

Get a specific rule.

#### `PUT /api/v1/normalization/rules/:id`

Update a normalization rule.

#### `DELETE /api/v1/normalization/rules/:id`

Delete a normalization rule.

#### `GET /api/v1/normalization/quality/:data_id`

Get data quality metrics for a specific dataset.

**Response:**
```json
{
  "overall": 0.92,
  "completeness": 0.95,
  "accuracy": 0.88,
  "consistency": 0.94,
  "timeliness": 0.91
}
```

#### `GET /api/v1/normalization/stats`

Get aggregated normalization statistics.

---

### Audit & Compliance

#### `POST /api/v1/audit/events`

Create an audit event.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/audit/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "data_access",
    "action": "view_risk_assessment",
    "resource": "risk_assessment",
    "resource_id": "assessment-uuid",
    "metadata": {"reason": "Quarterly review"}
  }'
```

**Event Types:** `data_access`, `data_modification`, `user_action`, `system_event`, `policy_change`, `data_deletion`, `model_decision`

#### `GET /api/v1/audit/logs`

List audit logs with filtering.

**Auth:** Bearer

```bash
curl "http://localhost:8080/api/v1/audit/logs?user_id=<uuid>&event_type=data_access&start_date=2025-01-01&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Filter by user ID |
| `event_type` | string | Filter by event type |
| `resource` | string | Filter by resource type |
| `start_date` | datetime | Start of date range |
| `end_date` | datetime | End of date range |
| `limit` | int | Results per page (default: 100) |
| `offset` | int | Pagination offset |

#### `GET /api/v1/audit/logs/:id`

Get a specific audit log entry.

#### `GET /api/v1/audit/compliance/report`

Generate a comprehensive compliance report.

**Response:**
```json
{
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z",
  "total_events": 15420,
  "event_types": {"data_access": 8500, "user_action": 4200, "system_event": 2720},
  "compliance": {
    "gdpr_compliant": true,
    "lgpd_compliant": true,
    "issues": [],
    "last_audit": "2025-01-10T14:00:00Z"
  },
  "anomalies": []
}
```

#### `GET /api/v1/compliance/status`

Get consolidated compliance status across all frameworks.

#### `GET /api/v1/compliance/lineage`

Get data lineage tracking information.

---

### Graph Intelligence

#### `POST /api/v1/graph/entities/resolve`

Resolve and deduplicate entities across data sources.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/graph/entities/resolve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "entities": [
      {"name": "Acme Corp", "type": "organization"},
      {"name": "ACME Corporation", "type": "organization"}
    ]
  }'
```

**Response:**
```json
{
  "resolved": [
    {
      "resolved_id": "entity-uuid",
      "original_entities": ["id-1", "id-2"],
      "confidence": 0.95
    }
  ]
}
```

#### `GET /api/v1/graph/entities/:id/relationships`

Get all relationships for an entity.

**Auth:** Bearer

#### `GET /api/v1/graph/entities/:id/neighbors`

Get neighboring entities with configurable depth.

**Auth:** Bearer

```bash
curl "http://localhost:8080/api/v1/graph/entities/<id>/neighbors?depth=2" \
  -H "Authorization: Bearer <token>"
```

#### `GET /api/v1/graph/risk/propagate` | `POST /api/v1/graph/risk/propagate`

Calculate risk propagation across the entity graph.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/graph/risk/propagate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_id": "entity-uuid",
    "max_depth": 3,
    "threshold": 0.1
  }'
```

**Response:**
```json
{
  "entity_id": "entity-uuid",
  "propagation_scores": {
    "entity-2": 0.85,
    "entity-3": 0.62,
    "entity-4": 0.31
  },
  "affected_entities": ["entity-2", "entity-3", "entity-4"],
  "max_depth": 3
}
```

#### `GET /api/v1/graph/communities`

Detect communities using the Louvain algorithm.

**Auth:** Bearer

#### `GET /api/v1/graph/centrality`

Calculate centrality metrics (PageRank, betweenness, closeness).

**Auth:** Bearer

#### `GET /api/v1/graph/path`

Find the shortest path between two entities.

**Auth:** Bearer

```bash
curl "http://localhost:8080/api/v1/graph/path?from=<entity-a>&to=<entity-b>" \
  -H "Authorization: Bearer <token>"
```

#### `GET /api/v1/graph/stats`

Get overall graph statistics.

**Response:**
```json
{
  "total_nodes": 12500,
  "total_relationships": 45000,
  "node_types": {"person": 5000, "organization": 3500, "location": 2000, "event": 2000},
  "relationship_types": {"OWNS": 8000, "EMPLOYS": 12000, "LOCATED_IN": 15000},
  "average_degree": 7.2
}
```

---

### Geospatial Intelligence

#### `POST /api/v1/geospatial/query`

Execute a spatial query within a bounding box or radius.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/geospatial/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bounds": {"north": 60.0, "south": 35.0, "east": 40.0, "west": -10.0},
    "layer_types": ["infrastructure", "energy"],
    "risk_threshold": 50
  }'
```

#### `GET /api/v1/geospatial/zones`

Get all geospatial zones and layers.

#### `GET /api/v1/geospatial/context`

Get location context (nearby assets, risk zones, events).

#### `GET /api/v1/geospatial/supply-chains`

Get supply chain route maps.

---

### OSINT & News

#### `GET /api/v1/osint/analysis`

Get OSINT analysis results.

**Auth:** Bearer

#### `GET /api/v1/osint/signals`

Get intelligence signals from OSINT sources.

#### `GET /api/v1/osint/feed`

Get the raw OSINT feed.

#### `POST /api/v1/osint/query`

Submit a custom OSINT query.

#### `GET /api/v1/news/articles`

Get aggregated news articles.

**Auth:** Bearer

```bash
curl "http://localhost:8080/api/v1/news/articles?category=geopolitical&region=europe&limit=20" \
  -H "Authorization: Bearer <token>"
```

#### `POST /api/v1/news/sources`

Register a news source.

#### `GET /api/v1/briefings`

List executive briefings.

#### `POST /api/v1/briefings`

Generate a new executive briefing.

#### `GET /api/v1/briefings/:id`

Get a specific briefing.

---

### Scenario Simulation

#### `POST /api/v1/scenarios`

Create a new scenario.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/scenarios \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Taiwan Strait Escalation",
    "type": "geopolitical_crisis",
    "parameters": {
      "region": "Asia Pacific",
      "severity": 8,
      "duration_days": 90,
      "iterations": 10000
    }
  }'
```

#### `GET /api/v1/scenarios`

List all scenarios.

#### `GET /api/v1/scenarios/:id`

Get a specific scenario.

#### `POST /api/v1/scenarios/:id/run`

Execute a scenario simulation.

#### `GET /api/v1/scenarios/:id/results`

Get simulation results.

**Response:**
```json
{
  "simulation_id": "sim-uuid",
  "scenario_id": "scenario-uuid",
  "status": "completed",
  "iterations": 10000,
  "results": {
    "best_case": {"probability": 0.15, "impact": 35.0},
    "worst_case": {"probability": 0.05, "impact": 95.0},
    "most_likely": {"probability": 0.60, "impact": 62.0}
  },
  "confidence": 0.87,
  "execution_time_ms": 4500
}
```

#### `GET /api/v1/scenarios/:id/compare`

Compare multiple scenario outcomes.

---

### War-Gaming

#### `GET /api/v1/wargaming/games`

List war-gaming exercises.

#### `POST /api/v1/wargaming/scenarios`

Create a war-gaming scenario.

#### `GET /api/v1/wargaming/games/:game_id`

Get a specific war game.

#### `POST /api/v1/wargaming/risk-escalation`

Trigger a risk escalation simulation.

---

### ML Infrastructure

#### `GET /api/v1/ml/models`

List all registered ML models.

**Auth:** Bearer

#### `POST /api/v1/ml/models/register`

Register a new ML model.

```bash
curl -X POST http://localhost:8080/api/v1/ml/models/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "risk-classifier-v2",
    "version": "2.0.0",
    "framework": "xgboost",
    "metrics": {"accuracy": 0.94, "f1": 0.91}
  }'
```

#### `GET /api/v1/ml/models/:model_name`

Get model details and metadata.

#### `POST /api/v1/ml/models/:model_name/predict`

Run a prediction using a registered model.

```bash
curl -X POST http://localhost:8080/api/v1/ml/models/risk-classifier-v2/predict \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "features": {"gdp_growth": -0.5, "conflict_index": 72, "trade_volume": 1200}
  }'
```

#### `GET /api/v1/ml/experiments`

List MLflow experiments.

#### `POST /api/v1/ml/experiments/runs`

Create a new experiment run.

---

### NLP Services

#### `POST /api/v1/nlp/ner`

Named Entity Recognition - extract entities from text.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/nlp/ner \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The European Union announced sanctions against Russian entities operating in Belarus."
  }'
```

**Response:**
```json
{
  "entities": [
    {"text": "European Union", "type": "ORGANIZATION", "start": 4, "end": 18},
    {"text": "Russian", "type": "NATIONALITY", "start": 47, "end": 54},
    {"text": "Belarus", "type": "LOCATION", "start": 77, "end": 84}
  ]
}
```

#### `POST /api/v1/nlp/sentiment`

Analyze sentiment of text content.

#### `POST /api/v1/nlp/classify`

Classify text into predefined categories.

#### `POST /api/v1/nlp/summarize`

Generate a summary of a long document.

#### `POST /api/v1/nlp/process`

Process text through the full NLP pipeline (NER + sentiment + classification).

---

### Explainable AI (XAI)

#### `POST /api/v1/xai/explain`

Get an explanation for a model prediction.

**Auth:** Bearer

```bash
curl -X POST http://localhost:8080/api/v1/xai/explain \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "risk-classifier-v2",
    "prediction_id": "pred-uuid",
    "method": "shap"
  }'
```

#### `GET /api/v1/xai/models/:model_id/features`

Get feature importance for a model.

#### `GET /api/v1/xai/predictions/:prediction_id/explanation`

Get a stored explanation for a prediction.

#### `POST /api/v1/xai/batch/explain`

Generate explanations for a batch of predictions.

---

### Model Serving & Monitoring

#### `GET /api/v1/models`

List all models available for serving.

#### `POST /api/v1/models/predict`

Run a prediction on a served model.

#### `GET /api/v1/models/:model_name/info`

Get model serving information.

#### `POST /api/v1/monitoring/drift/check`

Check for data drift in model inputs.

#### `POST /api/v1/monitoring/performance`

Submit performance metrics for a model.

#### `GET /api/v1/monitoring/models/:model_name/performance`

Get historical performance metrics.

#### `GET /api/v1/monitoring/models/:model_name/health`

Get model health status.

#### `GET /api/v1/monitoring/alerts`

Get model monitoring alerts.

---

### Digital Twins

#### `GET /api/v1/twins`

List all digital twins.

**Auth:** Bearer

#### `POST /api/v1/twins`

Create a new digital twin.

```bash
curl -X POST http://localhost:8080/api/v1/twins \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "European Energy Grid",
    "type": "infrastructure",
    "config": {
      "region": "europe",
      "nodes": 150,
      "update_interval": "5m"
    }
  }'
```

#### `GET /api/v1/twins/:twin_id`

Get a specific digital twin.

#### `PUT /api/v1/twins/:twin_id`

Update a digital twin.

#### `POST /api/v1/twins/:twin_id/simulate`

Run a simulation on a digital twin.

#### `GET /api/v1/twins/:twin_id/sync`

Sync a digital twin with live data.

---

### Policy Impact

#### `GET /api/v1/policy/analyses`

List policy impact analyses.

#### `POST /api/v1/policy/analyze`

Analyze the impact of a policy change.

```bash
curl -X POST http://localhost:8080/api/v1/policy/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_name": "EU Digital Markets Act Amendment",
    "sector": "technology",
    "regions": ["europe"],
    "impact_dimensions": ["economic", "regulatory", "operational"]
  }'
```

#### `GET /api/v1/policy/analyses/:analysis_id`

Get a specific analysis.

#### `POST /api/v1/policy/compare`

Compare the impact of multiple policies.

#### `POST /api/v1/policy/visualize`

Generate impact visualization data.

---

### Multi-Region & Data Residency

#### `GET /api/v1/regions`

List all configured regions.

#### `GET /api/v1/regions/:region_id`

Get region details.

#### `GET /api/v1/regions/:region_id/replication`

Get replication status for a region.

#### `POST /api/v1/regions/failover`

Trigger a regional failover.

#### `GET /api/v1/regions/routing`

Get current routing configuration.

#### `GET /api/v1/regions/health`

Get health status across all regions.

#### `GET /api/v1/residency/rules`

List data residency rules.

#### `POST /api/v1/residency/validate`

Validate data residency compliance.

#### `POST /api/v1/residency/rules`

Create a new residency rule.

#### `GET /api/v1/residency/data/:data_id/location`

Get the physical storage location of a data record.

#### `GET /api/v1/residency/compliance`

Get overall residency compliance status.

---

### Federated Learning

#### `GET /api/v1/federated/models`

List federated learning models.

#### `POST /api/v1/federated/models`

Create a new federated model.

#### `GET /api/v1/federated/models/:model_id`

Get model details.

#### `POST /api/v1/federated/models/:model_id/rounds`

Create a new training round.

#### `GET /api/v1/federated/models/:model_id/rounds/:round_id`

Get training round status.

#### `POST /api/v1/federated/models/:model_id/aggregate`

Aggregate model updates from participants.

#### `POST /api/v1/federated/continual/update`

Submit a continual learning update.

---

### Mobile API

#### `POST /api/v1/mobile/sessions`

Create a mobile session.

#### `GET /api/v1/mobile/dashboard`

Get mobile-optimized dashboard data.

#### `POST /api/v1/mobile/offline/sync`

Sync offline data from mobile device.

#### `GET /api/v1/mobile/offline/data`

Get data package for offline use.

#### `GET /api/v1/mobile/alerts`

Get mobile push alerts.

#### `POST /api/v1/mobile/notifications/register`

Register a device for push notifications.

---

### Compliance Automation

#### `GET /api/v1/compliance/automation/policies`

List compliance automation policies.

#### `POST /api/v1/compliance/automation/policies`

Create a new compliance policy.

#### `POST /api/v1/compliance/automation/scan`

Trigger a compliance scan.

#### `GET /api/v1/compliance/automation/scan/:scan_id`

Get scan results.

#### `GET /api/v1/compliance/automation/status`

Get overall automation status.

#### `POST /api/v1/compliance/automation/evidence/generate`

Generate compliance evidence documentation.

---

### Performance & Cost Optimization

#### `POST /api/v1/optimization/analyze`

Analyze system performance.

#### `GET /api/v1/optimization/metrics`

Get performance metrics.

#### `POST /api/v1/optimization/apply`

Apply an optimization recommendation.

#### `GET /api/v1/optimization/slo`

Get SLO (Service Level Objective) status.

#### `POST /api/v1/optimization/benchmark`

Run a performance benchmark.

#### `GET /api/v1/cost/analysis`

Get cost analysis breakdown.

#### `GET /api/v1/cost/recommendations`

Get cost optimization recommendations.

#### `POST /api/v1/cost/budgets`

Create a budget allocation.

#### `GET /api/v1/cost/budgets`

List budget allocations.

#### `GET /api/v1/cost/alerts`

Get cost threshold alerts.

---

### Security Certification

#### `GET /api/v1/certifications`

List security certifications.

#### `POST /api/v1/certifications/assess`

Run a certification readiness assessment.

#### `POST /api/v1/security/penetration-test`

Trigger an automated penetration test.

#### `GET /api/v1/security/penetration-tests`

Get penetration test results.

#### `GET /api/v1/security/red-team/exercises`

Get red team exercise results.

#### `GET /api/v1/security/compliance-status`

Get security compliance status.

---

### Advanced R&D

#### `GET /api/v1/rd/projects`

List R&D projects.

#### `POST /api/v1/rd/projects`

Create a new R&D project.

#### `POST /api/v1/rd/threats/simulate`

Simulate emerging threat scenarios.

#### `GET /api/v1/rd/models/experimental`

Get experimental model catalog.

#### `GET /api/v1/rd/partners`

List research partners.

---

### Continuous Improvement

#### `GET /api/v1/improvement/metrics`

Get system improvement metrics.

#### `POST /api/v1/improvement/requests`

Submit an improvement request.

#### `GET /api/v1/improvement/requests`

List improvement requests.

#### `POST /api/v1/improvement/feedback`

Submit platform feedback.

#### `GET /api/v1/improvement/recommendations`

Get improvement recommendations.

---

### Platform Overview

#### `GET /api/v1/overview/status`

Get aggregated platform status across all services.

**Auth:** Bearer

**Response:**
```json
{
  "overall": "operational",
  "services": {
    "api-gateway": {"status": "healthy", "latency_ms": 12},
    "iam": {"status": "healthy", "latency_ms": 8},
    "risk-assessment": {"status": "healthy", "latency_ms": 15},
    "graph-intelligence": {"status": "healthy", "latency_ms": 22}
  },
  "uptime": "99.97%",
  "last_check": "2025-01-15T10:30:00Z"
}
```

#### `GET /api/v1/overview/signals`

Get platform-wide intelligence signals.

#### `GET /api/v1/overview/kpis`

Get key performance indicators.

---

### Strategic Entities

#### `GET /api/v1/entities`

List strategic entities.

**Auth:** Bearer

#### `GET /api/v1/entities/:id`

Get a specific entity.

#### `POST /api/v1/entities`

Create a new strategic entity.

```bash
curl -X POST http://localhost:8080/api/v1/entities \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "type": "organization",
    "region": "North America",
    "tags": ["technology", "supply-chain"]
  }'
```

#### `GET /api/v1/entities/:id/context`

Get contextual intelligence for an entity.

#### `GET /api/v1/entities/:id/intelligence`

Get intelligence report for an entity.

---

## SDK Examples

### cURL - Full Authentication Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@2024"}' | jq -r '.access_token // .data.access_token')

# 2. Use the token
curl http://localhost:8080/api/v1/risks/trends \
  -H "Authorization: Bearer $TOKEN"

# 3. Assess risk
curl -X POST http://localhost:8080/api/v1/risks/assess \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "entity-uuid", "entity_type": "organization"}'

# 4. Logout
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### JavaScript / TypeScript

```typescript
const API_BASE = 'http://localhost:8080/api/v1';

// Login
const loginResponse = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'Admin@2024' })
});
const { access_token } = await loginResponse.json();

// Authenticated request
const risks = await fetch(`${API_BASE}/risks/trends?period=30d`, {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const data = await risks.json();
```

### Python

```python
import requests

API_BASE = "http://localhost:8080/api/v1"

# Login
session = requests.Session()
resp = session.post(f"{API_BASE}/auth/login", json={
    "username": "admin",
    "password": "Admin@2024"
})
token = resp.json()["access_token"]
session.headers.update({"Authorization": f"Bearer {token}"})

# Assess risk
assessment = session.post(f"{API_BASE}/risks/assess", json={
    "entity_id": "entity-uuid",
    "entity_type": "organization",
    "dimensions": ["operational", "financial", "geopolitical"]
})
print(assessment.json())
```

---

## Kafka Topics & Event Streaming

The platform uses Apache Kafka for asynchronous data processing:

| Topic | Producer | Consumer | Schema |
|-------|----------|----------|--------|
| `raw-data` | Ingestion Service | Normalization Service | `{source_id, timestamp, data, metadata}` |
| `normalized-data` | Normalization Service | Downstream consumers | `{original_id, source_id, data, quality_score, entities}` |

### Data Processing Flow

```
Data Source → Ingestion Service → [raw-data] → Normalization Service → [normalized-data] → Consumers
```

---

## Service Ports Reference

| Service | Container Port | Host Port | Protocol |
|---------|---------------|-----------|----------|
| Frontend (Next.js) | 3000 | 3004 | HTTP |
| API Gateway | 8080 | 8080 | HTTP |
| Prometheus Metrics | 9090 | 9090 | HTTP |
| IAM Service | 8081 | 8084 | HTTP |
| Risk Assessment | 8082 | 8086 | HTTP |
| Graph Intelligence | 8089 | 8089 | HTTP |
| PostgreSQL | 5432 | 5437 | TCP |
| PostGIS | 5432 | 5438 | TCP |
| Redis | 6379 | 6392 | TCP |
| Kafka | 29092 (internal) | 9093 | TCP |
| Zookeeper | 2181 | 2181 | TCP |

---

**ATLAS API v2.0.0** | Strategic Intelligence Platform
