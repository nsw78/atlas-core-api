# ATLAS Core API - API Specification

**Version:** 1.0.0  
**Last Updated:** 2024  
**OpenAPI Version:** 3.0.3

---

## API Design Principles

1. **RESTful Design**: Follow REST conventions
2. **Versioning**: URL-based versioning (`/api/v1/`, `/api/v2/`)
3. **JSON Format**: All requests/responses in JSON
4. **Error Handling**: Consistent error response format
5. **Pagination**: Cursor-based or offset-based pagination
6. **Filtering & Sorting**: Query parameters for data filtering
7. **Rate Limiting**: Per-user and per-API-key limits
8. **Authentication**: OAuth 2.0 / JWT tokens
9. **Documentation**: OpenAPI 3.0 specification
10. **Idempotency**: POST/PUT operations support idempotency keys

---

## Base URL Structure

```
Production:  https://api.atlas-intel.gov/v1
Staging:     https://api-staging.atlas-intel.gov/v1
Development: https://api-dev.atlas-intel.gov/v1
```

---

## Authentication

### OAuth 2.0 / JWT

All API requests require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

### Token Endpoints

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "secure_password",
  "mfa_code": "123456"  // Optional, if MFA enabled
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "user-123",
    "username": "user@example.com",
    "roles": ["analyst", "viewer"],
    "permissions": ["read:risks", "write:scenarios"]
  }
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response: 200 OK
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>

Response: 204 No Content
```

---

## Common Response Formats

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "request_id": "req-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request parameters are invalid",
    "details": [
      {
        "field": "entity_id",
        "reason": "Entity ID is required"
      }
    ],
    "request_id": "req-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Paginated Response
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  },
  "meta": {
    "request_id": "req-123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Core API Endpoints

### Risk Assessment API

#### Assess Risk
```http
POST /api/v1/risks/assess
Content-Type: application/json

{
  "entity_id": "country-BRA",
  "entity_type": "country",
  "dimensions": ["geopolitical", "economic", "infrastructure"],
  "time_horizon": "30d",  // "7d", "30d", "90d", "1y"
  "include_factors": true,
  "include_trends": true
}

Response: 200 OK
{
  "data": {
    "assessment_id": "risk-123",
    "entity_id": "country-BRA",
    "entity_type": "country",
    "overall_score": 0.65,
    "confidence": 0.82,
    "dimensions": {
      "geopolitical": {
        "score": 0.70,
        "trend": "increasing",
        "key_factors": [
          "Regional instability",
          "Trade tensions"
        ]
      },
      "economic": {
        "score": 0.60,
        "trend": "stable",
        "key_factors": [
          "Currency volatility",
          "Inflation concerns"
        ]
      },
      "infrastructure": {
        "score": 0.65,
        "trend": "stable",
        "key_factors": [
          "Energy grid resilience",
          "Digital infrastructure"
        ]
      }
    },
    "factors": [
      {
        "id": "factor-1",
        "name": "Regional instability",
        "impact": 0.15,
        "source": "news-aggregator",
        "source_id": "article-456"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "valid_until": "2024-01-16T10:30:00Z"
  }
}
```

#### Get Risk Assessment
```http
GET /api/v1/risks/{assessment_id}

Response: 200 OK
{
  "data": { ... }  // Same as assess response
}
```

#### Get Risk Trends
```http
GET /api/v1/risks/trends?entity_id=country-BRA&dimension=geopolitical&period=90d

Response: 200 OK
{
  "data": {
    "entity_id": "country-BRA",
    "dimension": "geopolitical",
    "period": "90d",
    "trends": [
      {
        "date": "2024-01-01",
        "score": 0.65,
        "confidence": 0.80
      },
      {
        "date": "2024-01-15",
        "score": 0.70,
        "confidence": 0.82
      }
    ],
    "trend_direction": "increasing",
    "volatility": 0.12
  }
}
```

#### Configure Risk Alerts
```http
POST /api/v1/risks/alerts
Content-Type: application/json

{
  "entity_id": "country-BRA",
  "dimension": "geopolitical",
  "threshold": 0.75,
  "direction": "above",  // "above", "below", "change"
  "notification_channels": ["email", "webhook"],
  "webhook_url": "https://example.com/webhook"
}

Response: 201 Created
{
  "data": {
    "alert_id": "alert-123",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### Scenario Simulation API

#### Create Scenario
```http
POST /api/v1/scenarios
Content-Type: application/json

{
  "name": "Supply Chain Disruption - Electronics",
  "description": "Simulate impact of major electronics supply chain disruption",
  "model_type": "supply_chain",
  "parameters": {
    "affected_regions": ["asia-pacific"],
    "disruption_severity": 0.8,
    "duration_days": 30,
    "affected_industries": ["electronics", "automotive"]
  },
  "simulation_horizon": "90d"
}

Response: 201 Created
{
  "data": {
    "scenario_id": "scenario-123",
    "name": "Supply Chain Disruption - Electronics",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Execute Scenario
```http
POST /api/v1/scenarios/{scenario_id}/run

Response: 202 Accepted
{
  "data": {
    "scenario_id": "scenario-123",
    "status": "running",
    "estimated_completion": "2024-01-15T10:35:00Z"
  }
}
```

#### Get Scenario Results
```http
GET /api/v1/scenarios/{scenario_id}/results

Response: 200 OK
{
  "data": {
    "scenario_id": "scenario-123",
    "status": "completed",
    "results": {
      "economic_impact": {
        "gdp_impact_percent": -2.5,
        "affected_sectors": ["electronics", "automotive"],
        "estimated_loss_usd": 50000000000
      },
      "infrastructure_impact": {
        "affected_facilities": 150,
        "critical_paths_disrupted": 12
      },
      "timeline": [
        {
          "day": 1,
          "events": ["Initial disruption detected"],
          "impact_score": 0.3
        },
        {
          "day": 30,
          "events": ["Peak disruption", "Alternative routes activated"],
          "impact_score": 0.8
        }
      ]
    },
    "completed_at": "2024-01-15T10:34:00Z"
  }
}
```

#### Compare Scenarios
```http
GET /api/v1/scenarios/compare?scenario_ids=scenario-123,scenario-124

Response: 200 OK
{
  "data": {
    "scenarios": [
      {
        "scenario_id": "scenario-123",
        "name": "Supply Chain Disruption - Electronics",
        "key_metrics": { ... }
      },
      {
        "scenario_id": "scenario-124",
        "name": "Supply Chain Disruption - Energy",
        "key_metrics": { ... }
      }
    ],
    "comparison": {
      "economic_impact_difference": 0.15,
      "infrastructure_impact_difference": 0.08
    }
  }
}
```

---

### Explainable AI (XAI) API

#### Explain Prediction
```http
POST /api/v1/xai/explain
Content-Type: application/json

{
  "model_id": "risk-model-v2",
  "prediction_id": "pred-123",
  "explanation_type": "shap",  // "shap", "lime", "integrated_gradients"
  "include_features": true
}

Response: 200 OK
{
  "data": {
    "prediction_id": "pred-123",
    "model_id": "risk-model-v2",
    "prediction": 0.75,
    "explanation": {
      "method": "shap",
      "feature_importance": [
        {
          "feature": "geopolitical_instability_index",
          "importance": 0.25,
          "contribution": 0.15
        },
        {
          "feature": "trade_flow_change",
          "importance": 0.18,
          "contribution": 0.10
        }
      ],
      "base_value": 0.50,
      "confidence": 0.85
    },
    "counterfactuals": [
      {
        "condition": "If geopolitical_instability_index decreased by 20%",
        "predicted_outcome": 0.60,
        "confidence": 0.80
      }
    ]
  }
}
```

#### Get Feature Importance
```http
GET /api/v1/xai/features/{model_id}?top_n=10

Response: 200 OK
{
  "data": {
    "model_id": "risk-model-v2",
    "features": [
      {
        "feature_name": "geopolitical_instability_index",
        "importance": 0.25,
        "description": "Aggregated index of regional stability indicators"
      },
      {
        "feature_name": "trade_flow_change",
        "importance": 0.18,
        "description": "Percentage change in trade flows"
      }
    ]
  }
}
```

---

### Graph Intelligence API

#### Add Entities
```http
POST /api/v1/graph/entities
Content-Type: application/json

{
  "entities": [
    {
      "id": "org-123",
      "type": "organization",
      "properties": {
        "name": "Tech Corp Inc",
        "country": "USA",
        "industry": "technology"
      }
    },
    {
      "id": "person-456",
      "type": "person",
      "properties": {
        "name": "John Doe",
        "role": "CEO"
      }
    }
  ]
}

Response: 201 Created
{
  "data": {
    "entities_created": 2,
    "entity_ids": ["org-123", "person-456"]
  }
}
```

#### Add Relationships
```http
POST /api/v1/graph/relationships
Content-Type: application/json

{
  "relationships": [
    {
      "from": "person-456",
      "to": "org-123",
      "type": "LEADS",
      "properties": {
        "since": "2020-01-01",
        "verified": true
      }
    }
  ]
}

Response: 201 Created
{
  "data": {
    "relationships_created": 1
  }
}
```

#### Analyze Graph
```http
POST /api/v1/graph/analyze
Content-Type: application/json

{
  "entity_ids": ["org-123", "person-456"],
  "metrics": ["centrality", "communities", "influence"],
  "depth": 3
}

Response: 200 OK
{
  "data": {
    "centrality": {
      "org-123": 0.85,
      "person-456": 0.72
    },
    "communities": [
      {
        "community_id": "comm-1",
        "entities": ["org-123", "person-456"],
        "cohesion": 0.90
      }
    ],
    "influence_scores": {
      "org-123": 0.88,
      "person-456": 0.75
    }
  }
}
```

#### Find Paths
```http
GET /api/v1/graph/paths?from=entity-1&to=entity-2&max_depth=5

Response: 200 OK
{
  "data": {
    "paths": [
      {
        "path": ["entity-1", "entity-3", "entity-2"],
        "length": 2,
        "relationship_types": ["CONNECTED_TO", "PARTNER_OF"]
      }
    ],
    "shortest_path_length": 2
  }
}
```

---

### Geospatial API

#### Spatial Query
```http
POST /api/v1/geo/query
Content-Type: application/json

{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-74.0, 40.0],
      [-73.0, 40.0],
      [-73.0, 41.0],
      [-74.0, 41.0],
      [-74.0, 40.0]
    ]]
  },
  "entity_types": ["infrastructure", "port"],
  "filters": {
    "status": "active"
  }
}

Response: 200 OK
{
  "data": {
    "entities": [
      {
        "id": "port-123",
        "type": "port",
        "name": "Port of New York",
        "location": {
          "type": "Point",
          "coordinates": [-73.5, 40.5]
        },
        "properties": {
          "status": "active",
          "capacity": "large"
        }
      }
    ],
    "total": 1
  }
}
```

#### Get Legal Zones
```http
GET /api/v1/geo/zones?type=eez&country=USA

Response: 200 OK
{
  "data": {
    "zones": [
      {
        "type": "eez",
        "country": "USA",
        "geometry": {
          "type": "Polygon",
          "coordinates": [ ... ]
        },
        "area_km2": 11350000,
        "source": "public_maritime_data"
      }
    ]
  }
}
```

---

### Data Ingestion API

#### Register News Source
```http
POST /api/v1/news/sources
Content-Type: application/json

{
  "name": "Reuters",
  "type": "rss",
  "url": "https://www.reuters.com/rss",
  "language": "en",
  "credibility_score": 0.90,
  "update_frequency": "hourly"
}

Response: 201 Created
{
  "data": {
    "source_id": "source-123",
    "status": "active"
  }
}
```

#### Get Articles
```http
GET /api/v1/news/articles?source_id=source-123&limit=20&offset=0&sort=date_desc

Response: 200 OK
{
  "data": {
    "articles": [
      {
        "id": "article-123",
        "title": "Geopolitical Tensions Rise",
        "source": "Reuters",
        "source_id": "source-123",
        "published_at": "2024-01-15T08:00:00Z",
        "url": "https://reuters.com/article/123",
        "summary": "Summary text...",
        "entities": ["country-BRA", "country-ARG"],
        "sentiment": 0.3,
        "credibility_score": 0.90
      }
    ],
    "pagination": { ... }
  }
}
```

---

## WebSocket API

### Real-time Updates

#### Connection
```javascript
const ws = new WebSocket('wss://api.atlas-intel.gov/v1/ws?token=<jwt_token>');
```

#### Subscribe to Risk Alerts
```json
{
  "action": "subscribe",
  "channel": "risks",
  "filters": {
    "entity_id": "country-BRA",
    "threshold": 0.75
  }
}
```

#### Receive Update
```json
{
  "channel": "risks",
  "event": "alert_triggered",
  "data": {
    "alert_id": "alert-123",
    "entity_id": "country-BRA",
    "dimension": "geopolitical",
    "current_score": 0.78,
    "threshold": 0.75,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Rate Limiting

### Limits
- **Authenticated Users**: 1000 requests/hour
- **API Keys**: 5000 requests/hour
- **WebSocket Connections**: 10 per user

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

### Rate Limit Exceeded
```http
Response: 429 Too Many Requests
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 3600
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request parameters are invalid |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## API Versioning Strategy

### Version Lifecycle
- **v1**: Current stable version
- **v2**: Next version (beta)
- **Deprecated versions**: 6-month deprecation notice

### Version Header
```http
API-Version: v1
```

### Deprecation Notice
```http
Response Headers:
Deprecation: true
Sunset: Sat, 15 Jul 2024 00:00:00 GMT
Link: <https://api.atlas-intel.gov/v2/docs>; rel="successor-version"
```

---

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- `/api/v1/openapi.json` - Machine-readable spec
- `/api/v1/docs` - Interactive API documentation (Swagger UI)
- `/api/v1/redoc` - Alternative documentation (ReDoc)

---

## SDKs and Client Libraries

Official SDKs available for:
- **Python**: `pip install atlas-intel-sdk`
- **JavaScript/TypeScript**: `npm install @atlas-intel/sdk`
- **Go**: `go get github.com/atlas-intel/sdk-go`
- **Java**: Maven Central (coming soon)

---

## Testing

### Sandbox Environment
- Base URL: `https://api-sandbox.atlas-intel.gov/v1`
- Test credentials provided upon request
- Rate limits: 100 requests/hour
- Data reset: Daily at 00:00 UTC

### Postman Collection
Available at: `https://github.com/atlas-intel/api-examples`
