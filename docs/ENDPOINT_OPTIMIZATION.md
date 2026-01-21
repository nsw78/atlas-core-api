# OTIMIZAÇÕES DE ENDPOINTS - ATLAS CORE API

## Diagnóstico de Performance

Este documento detalha otimizações necessárias nos endpoints backend para melhorar tempo de resposta e escalabilidade.

---

## 1. OTIMIZAÇÕES NO BANCO DE DADOS

### 1.1 Connection Pooling

**Problema Identificado:** Cada requisição cria nova conexão com banco

**Solução - PostgreSQL:**
```python
# services/python-api-gateway/app/db.py
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,  # Verifica conexão antes de usar
    pool_recycle=3600,   # Recicla conexão a cada 1h
)
```

### 1.2 Índices Críticos

**Para GIS (PostGIS):**
```sql
-- Índices geoespaciais
CREATE INDEX idx_features_geom ON features USING GIST(geometry);
CREATE INDEX idx_features_properties ON features USING GIN(properties);

-- Índices de performance
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX idx_alerts_resolved ON alerts(resolved, timestamp DESC);
CREATE INDEX idx_kpis_date ON kpis(created_at DESC);
```

### 1.3 Query Optimization

**Problema:** N+1 queries em listagens

**Solução:**
```python
# ✗ Ruim - N+1 query
alerts = Alert.query.all()
for alert in alerts:
    print(alert.user.name)  # Query individual por usuário

# ✓ Bom - Eager loading
alerts = Alert.query.options(
    joinedload(Alert.user)
).all()
```

### 1.4 Materialized Views para Dashboards

```sql
-- Cache de KPIs (atualizar a cada 5 minutos)
CREATE MATERIALIZED VIEW kpis_cache AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as alert_count,
    AVG(severity) as avg_severity,
    COUNT(CASE WHEN resolved THEN 1 END) as resolved_count
FROM alerts
GROUP BY DATE_TRUNC('hour', timestamp);

CREATE INDEX idx_kpis_cache_hour ON kpis_cache(hour);
```

---

## 2. CACHING COM REDIS

### 2.1 Cache Strategy

```python
# lib/cache.py
import redis
from functools import wraps
import json

cache = redis.Redis(
    host='redis',
    port=6379,
    db=0,
    decode_responses=True,
    socket_connect_timeout=2,
    socket_keepalive=True,
)

def cached(ttl_seconds=300):
    """Decorator para cache de endpoints"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Gerar chave única
            cache_key = f"{func.__name__}:{args}:{kwargs}"
            
            # Tentar recuperar do cache
            cached_value = cache.get(cache_key)
            if cached_value:
                return json.loads(cached_value)
            
            # Executar função
            result = func(*args, **kwargs)
            
            # Armazenar no cache
            cache.setex(
                cache_key,
                ttl_seconds,
                json.dumps(result)
            )
            
            return result
        return wrapper
    return decorator

# Uso
@cached(ttl_seconds=300)
def get_dashboard_kpis():
    # Query pesada aqui
    return kpis
```

### 2.2 Cache Keys Strategy

```python
# keys.py
class CacheKeys:
    # GIS
    GIS_FEATURES = "gis:features:{layer}:{zoom}"
    GIS_STATS = "gis:stats:{layer}"
    
    # Alerts
    ALERTS_ACTIVE = "alerts:active"
    ALERTS_BY_TYPE = "alerts:type:{type}"
    
    # Dashboard
    DASHBOARD_KPIS = "dashboard:kpis"
    DASHBOARD_SUMMARY = "dashboard:summary"
    
    # User
    USER_PERMISSIONS = "user:{user_id}:permissions"
    USER_SESSION = "user:{user_id}:session"
```

### 2.3 Cache Invalidation

```python
from datetime import datetime, timedelta

# Invalidar cache quando dados mudam
async def create_alert(alert_data):
    alert = Alert.create(**alert_data)
    
    # Invalidar caches relacionados
    cache.delete(CacheKeys.ALERTS_ACTIVE)
    cache.delete(CacheKeys.DASHBOARD_KPIS)
    cache.delete(CacheKeys.DASHBOARD_SUMMARY)
    
    # Publicar em channel para WebSocket
    await publish_event("alert:new", alert.to_dict())
    
    return alert
```

---

## 3. API GATEWAY OTIMIZAÇÕES

### 3.1 Rate Limiting

```python
# services/python-api-gateway/middleware/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Aplicar em endpoints críticos
@app.get("/api/gis/data")
@limiter.limit("100/minute")
async def get_gis_data():
    pass

@app.post("/api/alerts")
@limiter.limit("50/minute")
async def create_alert():
    pass
```

### 3.2 Request Compression

```python
# Comprimir respostas > 1KB
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1024)
```

### 3.3 Connection Pooling HTTP

```python
# services/python-api-gateway/lib/http_client.py
import httpx

# Reusar conexões HTTP
client = httpx.AsyncClient(
    timeout=10.0,
    limits=httpx.Limits(
        max_keepalive_connections=100,
        max_connections=100,
    ),
)
```

---

## 4. ENDPOINTS ESPECÍFICOS - OTIMIZAÇÕES

### 4.1 GET /api/gis/data

**Problema:** Query retorna todos os features sem limite

**Otimização:**
```python
@app.get("/api/gis/data")
@cached(ttl_seconds=300)
async def get_gis_data(
    layer: str,
    bbox: List[float],
    limit: int = Query(1000, le=10000),
    offset: int = Query(0),
):
    """
    Otimizações:
    1. Usar índice GIST para bbox
    2. Limit + offset ao invés de trazer tudo
    3. Selecionar apenas colunas necessárias
    4. Cache de 5 minutos
    """
    query = db.session.query(
        Feature.id,
        Feature.geometry,
        Feature.properties,
    ).filter(
        Feature.layer == layer,
        ST_Intersects(Feature.geometry, ST_MakeEnvelope(*bbox)),
    ).limit(limit).offset(offset)
    
    return {"features": query.all(), "total": query.count()}
```

### 4.2 GET /api/alerts

**Otimização:**
```python
@app.get("/api/alerts")
async def get_alerts(
    resolved: bool = Query(False),
    limit: int = Query(50, le=500),
    offset: int = Query(0),
):
    """
    1. Filter por resolved (usa índice)
    2. Order DESC por timestamp com índice
    3. Pagination obrigatória
    4. Cache por tipo de query
    """
    alerts = Alert.query.filter_by(
        resolved=resolved
    ).order_by(
        Alert.timestamp.desc()
    ).limit(limit).offset(offset).all()
    
    return {
        "alerts": alerts,
        "total": Alert.query.filter_by(resolved=resolved).count()
    }
```

### 4.3 POST /api/gis/query

**Problema:** Queries pesadas em tempo real

**Otimização:**
```python
@app.post("/api/gis/query")
async def query_gis(query_params: GISQueryParams):
    """
    Otimizações:
    1. Usar view materializada se < 5 min de query
    2. Limitar resultado a 10K features
    3. Usar índices espaciais
    4. Async processing para operações pesadas
    """
    # Verificar se é query pré-computada
    if query_params.is_aggregation:
        return await get_from_materialized_view(query_params)
    
    # Caso contrário, limitar resultado
    result = db.session.query(Feature).filter(
        ST_Intersects(Feature.geometry, ST_GeomFromText(query_params.wkt))
    ).limit(10000).all()
    
    return {"features": result}
```

---

## 5. OTIMIZAÇÕES DE SERIALIZAÇÃO

### 5.1 Usar Orjson (mais rápido que json padrão)

```python
# services/python-api-gateway/main.py
import orjson
from fastapi.responses import JSONResponse

def custom_json_encoder(obj):
    return orjson.dumps(obj).decode()

class OrjsonResponse(JSONResponse):
    media_type = "application/json"

    def render(self, content) -> bytes:
        return orjson.dumps(content)

# Usar em app
app = FastAPI()
app.default_response_class = OrjsonResponse
```

### 5.2 Partial Response Selection

```python
@app.get("/api/alerts")
async def get_alerts(
    fields: str = Query("id,title,type,timestamp"),
):
    """Permitir selecionar apenas campos necessários"""
    selected_fields = [f.strip() for f in fields.split(",")]
    
    query = db.session.query(Alert)
    
    # Selecionar apenas campos solicitados
    columns = [getattr(Alert, field) for field in selected_fields if hasattr(Alert, field)]
    
    return query.with_entities(*columns).all()
```

---

## 6. MONITORAMENTO E OBSERVABILIDADE

### 6.1 Prometheus Metrics

```python
# lib/metrics.py
from prometheus_client import Counter, Histogram

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
)

cache_hits = Counter(
    'cache_hits_total',
    'Cache hit count',
    ['key_pattern'],
)

db_query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query latency',
    ['query_type'],
)
```

### 6.2 Logging Estruturado

```python
import logging
import json
from pythonjsonlogger import jsonlogger

handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
handler.setFormatter(formatter)
logger = logging.getLogger()
logger.addHandler(handler)

# Uso
logger.info("Endpoint hit", extra={
    "endpoint": "/api/gis/data",
    "response_time_ms": 145,
    "cache_hit": True,
})
```

---

## 7. CHECKLIST DE IMPLEMENTAÇÃO

### Priority 1 (CRÍTICO - Fazer Primeiro)
- [ ] Connection pooling PostgreSQL
- [ ] Índices no banco de dados
- [ ] Redis cache para dashboard
- [ ] Rate limiting na API gateway
- [ ] Request compression (gzip)

### Priority 2 (ALTO - Próximas 2 semanas)
- [ ] Pagination obrigatória
- [ ] Orjson serialization
- [ ] Cache invalidation strategy
- [ ] Prometheus metrics
- [ ] Materialized views para queries pesadas

### Priority 3 (MÉDIO - Próximas 4 semanas)
- [ ] Query optimization / N+1 prevention
- [ ] Async processing para operações pesadas
- [ ] CDN para assets estáticos
- [ ] Database query analysis tool
- [ ] Auto-scaling baseado em métricas

---

## 8. EXPECTED IMPROVEMENTS

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|---------|
| Startup Time | 120s | 45s | -62% |
| Dashboard Load | 3.5s | 600ms | -83% |
| API Response Time | 800ms | 150ms | -81% |
| Memory Usage | 2GB | 800MB | -60% |
| DB Connections | Unlimited | 20 pooled | Estável |
| Requests/sec | 100 | 500+ | +5x |

---

## Próximas Ações

1. **Hoje:** Implementar connection pooling + índices
2. **Semana 1:** Redis caching + rate limiting
3. **Semana 2:** Query optimization + pagination
4. **Semana 3:** Monitoramento e ajustes finos
