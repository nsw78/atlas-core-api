# ATLAS Frontend & Backend Setup Guide

## 📋 Pré-requisitos

- Docker Desktop 4.0+
- Docker Compose v2.0+ (integrado no Docker Desktop)
- Node.js 18+ (para desenvolvimento local do frontend)
- Git

## ✅ Verificar Instalação

```powershell
# Verificar Docker
docker --version
# Esperado: Docker version 25.0.0+

# Verificar Docker Compose  
docker compose version
# Esperado: Docker Compose version 2.20.0+

# Verificar Node.js (opcional, se desenvolver localmente)
node --version
# Esperado: v18.0.0+
```

## 🚀 Quick Start (MVP - Recomendado para Primeira Vez)

### 1. Clonar/Preparar o Repositório

```powershell
cd "c:\Users\t.nwa_tfsports\Documents\Projetos_IA\atlas-core-api"

# Criar arquivo .env se não existir
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env 2>$null -or `
    @"
POSTGRES_PASSWORD=atlas_dev
NEO4J_PASSWORD=neo4j_dev
JWT_SECRET=dev-secret-change-in-production-immediately
NEXT_PUBLIC_API_URL=http://localhost:8080
GRAFANA_PASSWORD=admin
"@ | Out-File -Encoding UTF8 .env
}
```

### 2. Subir Containers MVP (Recomendado)

```powershell
# Usar docker-compose.mvp.yml (apenas serviços essenciais)
docker compose -f docker-compose.mvp.yml up -d

# Aguarde ~30 segundos para os serviços iniciarem
Start-Sleep -Seconds 30

# Verificar status
docker compose -f docker-compose.mvp.yml ps
```

**MVP inclui:**
- ✓ PostgreSQL (banco principal)
- ✓ Redis (cache)
- ✓ Python API Gateway (porta 8080)
- ✓ Frontend Next.js (porta 3000)
- ✓ Prometheus (monitoramento)
- ✓ Grafana (dashboards)

### 3. Acessar Serviços

| Serviço | URL | Credenciais |
|---------|-----|------------|
| Frontend | http://localhost:3000 | N/A |
| API Gateway | http://localhost:8080 | N/A |
| Prometheus | http://localhost:9090 | N/A |
| Grafana | http://localhost:3001 | admin / admin |
| PostgreSQL | localhost:5432 | atlas / atlas_dev |
| Redis | localhost:6379 | N/A |

## 📊 Monitorar Performance

### 1. Verificar Logs

```powershell
# Logs do Frontend
docker compose -f docker-compose.mvp.yml logs -f frontend

# Logs da API Gateway
docker compose -f docker-compose.mvp.yml logs -f python-api-gateway

# Logs do PostgreSQL
docker compose -f docker-compose.mvp.yml logs -f postgres

# Todos os logs
docker compose -f docker-compose.mvp.yml logs -f
```

### 2. Verificar Health Check

```powershell
# Verificar se serviços estão saudáveis
docker compose -f docker-compose.mvp.yml ps

# Status esperado:
# SERVICE                    STATUS
# atlas-postgres            healthy
# atlas-redis               healthy
# atlas-python-api-gateway  healthy
# atlas-frontend            healthy
# atlas-prometheus          running
# atlas-grafana             running
```

### 3. Teste de Performance

```powershell
# Executar script de análise
powershell .\analyze-performance.ps1

# Aguarde os resultados
```

## 🔧 Desenvolvimento Local do Frontend

Se quiser desenvolver o frontend localmente (sem Docker):

```powershell
cd services/frontend

# Instalar dependências
pnpm install  # ou npm install

# Desenvolvimento
pnpm dev

# Acesso em http://localhost:3000
```

## 🐛 Troubleshooting

### Port Already in Use

```powershell
# Encontrar processo usando porta
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | Get-Process

# Liberar porta
Stop-Process -Id <PID> -Force

# Ou mudar porta no docker-compose
# Editar docker-compose.mvp.yml:
# ports:
#   - "3001:3000"  (mudou de 3000:3000)
```

### Container Fails to Start

```powershell
# Ver erro completo
docker compose -f docker-compose.mvp.yml logs <service-name>

# Rebuild sem cache
docker compose -f docker-compose.mvp.yml build --no-cache

# Restart
docker compose -f docker-compose.mvp.yml up -d
```

### API Gateway Connection Error

```powershell
# Verificar se PostgreSQL está pronto
docker compose -f docker-compose.mvp.yml exec postgres pg_isready -U atlas

# Verificar se Redis está pronto
docker compose -f docker-compose.mvp.yml exec redis redis-cli ping

# Verificar logs da API Gateway
docker compose -f docker-compose.mvp.yml logs python-api-gateway
```

## 📈 Escalabilidade - Próxima Fase

Quando MVP funcionar perfeitamente, adicionar serviços:

```powershell
# Usar full stack (incluir NLP, Graph Intelligence, XAI, etc)
docker compose -f docker-compose.yml up -d

# Isso vai:
# - Adicionar PostGIS (GIS avançado)
# - Adicionar Kafka (event streaming)
# - Adicionar Neo4j (graph database)
# - Adicionar MLflow (model serving)
# - Adicionar todos os microserviços
```

## 🛑 Parar Serviços

```powershell
# Parar sem remover (dados persistem)
docker compose -f docker-compose.mvp.yml stop

# Parar e remover containers
docker compose -f docker-compose.mvp.yml down

# Parar, remover containers E volumes (limpar tudo)
docker compose -f docker-compose.mvp.yml down -v
```

## 🔍 Monitoramento em Tempo Real

### Grafana Dashboard

1. Acesse http://localhost:3001
2. Login: admin / admin
3. Adicionar datasource Prometheus (localhost:9090)
4. Importar dashboard "Node Exporter" (ID: 1860)

### Prometheus Queries

```
# Taxa de requisições
rate(http_request_duration_seconds_bucket[1m])

# Latência P95
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# Cache hit ratio
increase(cache_hits_total[5m]) / increase(cache_requests_total[5m])
```

## 📝 Próximas Otimizações

Depois de validar o MVP, implementar (ver `ENDPOINT_OPTIMIZATION.md`):

1. ✓ Connection Pooling PostgreSQL (já feito)
2. ✓ Redis Caching (já feito)
3. ✓ Request Compression (já feito)
4. [ ] Índices no banco de dados
5. [ ] Query optimization
6. [ ] Materialized views
7. [ ] Async processing
8. [ ] CDN para assets

---

**Tempo Estimado de Setup:** 5 minutos  
**Tempo Estimado de Startup:** 30-45 segundos  
**Documentação Completa:** Veja `docs/FRONTEND_ARCHITECTURE_STRATEGIC.md` e `docs/ENDPOINT_OPTIMIZATION.md`
