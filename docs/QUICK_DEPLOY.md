# ATLAS Core API - Quick Deploy Guide

**Objetivo:** Subir a API com todas as melhorias implementadas em **< 5 minutos**

---

## 📋 Pré-requisitos

✅ Docker Desktop instalado e rodando
✅ Git instalado
✅ Go 1.21+ (para build local)
✅ PowerShell ou Bash

---

## 🚀 Deploy em 4 Passos

### Passo 1: Preparar Ambiente

```powershell
# Clone ou navegue até o repositório
cd c:\Users\t.nwa_tfsports\Documents\Projetos_IA\atlas-core-api

# Criar arquivo .env (se não existir)
@"
POSTGRES_PASSWORD=atlas_dev_secure_2026
JWT_SECRET=change-this-in-production-2026
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
GRAFANA_PASSWORD=admin
"@ | Out-File -Encoding UTF8 .env

# Criar diretório de backups
New-Item -ItemType Directory -Force -Path backups\postgres, backups\postgis
```

### Passo 2: Atualizar Dependências Go

```powershell
# API Gateway
cd services\api-gateway
go mod tidy
go mod download
cd ..\..

# Repetir para outros serviços se necessário
```

### Passo 3: Rodar Migrations

```powershell
# Instalar golang-migrate (apenas primeira vez)
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Subir apenas PostgreSQL primeiro
docker-compose up -d postgres postgis

# Aguardar PostgreSQL estar pronto (20 segundos)
Start-Sleep -Seconds 20

# Rodar migrations
$env:DB_URL="postgres://atlas:atlas_dev_secure_2026@localhost:5432/atlas?sslmode=disable"
$env:GEO_DB_URL="postgres://atlas:atlas_dev_secure_2026@localhost:5433/atlas_geo?sslmode=disable"

migrate -path migrations -database $env:DB_URL up
migrate -path migrations -database $env:GEO_DB_URL up
```

### Passo 4: Iniciar Todos os Serviços

```powershell
# MVP (desenvolvimento - sem NGINX)
docker-compose up -d

# OU Produção (com NGINX + Backup)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verificar status
docker-compose ps
```

---

## ✅ Validação Rápida

### Script de Validação Automática

```powershell
.\validate-improvements.ps1
```

### Validação Manual

#### 1. Health Check
```powershell
curl http://localhost:8080/health
# Esperado: {"data":{"status":"operational"}}
```

#### 2. Rate Limiting
```powershell
# Fazer 101 requests rapidamente (deve bloquear após 100)
1..101 | ForEach-Object {
    curl http://localhost:8080/health -Silent
    Write-Host "Request $_"
}
# Esperado: 429 Too Many Requests após 100 requests
```

#### 3. CORS Headers
```powershell
curl -I http://localhost:8080/health
# Esperado: Access-Control-Allow-Origin: http://localhost:3000
```

#### 4. Security Headers
```powershell
curl -I http://localhost:8080/health
# Esperado:
#   X-Frame-Options: DENY
#   X-Content-Type-Options: nosniff
#   X-XSS-Protection: 1; mode=block
```

#### 5. GZip Compression
```powershell
curl -H "Accept-Encoding: gzip" -I http://localhost:8080/health
# Esperado: Content-Encoding: gzip
```

#### 6. httpOnly Cookies (Login Test)
```powershell
# Fazer login (mock endpoint)
curl -X POST http://localhost:8080/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"test"}' `
  -c cookies.txt

# Verificar cookies.txt
Get-Content cookies.txt
# Esperado: access_token com HttpOnly flag
```

#### 7. Cache Headers
```powershell
# Primeira request (cache MISS)
curl -I http://localhost:8080/api/v1/overview/kpis
# Esperado: X-Cache: MISS

# Segunda request (cache HIT)
curl -I http://localhost:8080/api/v1/overview/kpis
# Esperado: X-Cache: HIT
```

#### 8. Database Migrations
```powershell
# Conectar ao PostgreSQL
docker exec -it atlas-postgres psql -U atlas -d atlas

# Verificar tabelas
\dt

# Esperado: users, roles, risk_assessments, audit_logs, etc.
```

#### 9. PostgreSQL Performance
```powershell
docker exec -it atlas-postgres psql -U atlas -d atlas -c "SHOW max_connections;"
# Esperado: 500

docker exec -it atlas-postgres psql -U atlas -d atlas -c "SHOW shared_buffers;"
# Esperado: 512MB
```

---

## 🧪 Testes

### Rodar Testes Unitários

```powershell
# Usando Makefile
make test

# OU Manualmente
cd services\api-gateway
go test ./... -v
```

### Testes de Performance

```bash
# Instalar k6 (https://k6.io)
choco install k6

# Rodar load test básico
k6 run --vus 100 --duration 30s - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  const res = http.get('http://localhost:8080/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF
```

---

## 🐛 Troubleshooting

### PostgreSQL não inicia
```powershell
# Ver logs
docker-compose logs postgres

# Recriar volume
docker-compose down -v
docker volume rm atlas-core-api_postgres_data
docker-compose up -d postgres
```

### Migrations falharam
```powershell
# Forçar versão (exemplo: versão 1)
migrate -path migrations -database $env:DB_URL force 1

# Tentar novamente
migrate -path migrations -database $env:DB_URL up
```

### Go mod errors
```powershell
cd services\api-gateway
go clean -modcache
go mod tidy
go mod download
```

### Rate limiting não funciona
```powershell
# Verificar se middleware está ativado
docker-compose logs python-api-gateway | Select-String "rate"

# Verificar go.mod tem ulule/limiter
Get-Content services\api-gateway\go.mod | Select-String "limiter"
```

### CORS errors no frontend
```powershell
# Verificar ALLOWED_ORIGINS no .env
Get-Content .env | Select-String "ALLOWED_ORIGINS"

# Deve conter o domínio do frontend
# ALLOWED_ORIGINS=http://localhost:3000
```

---

## 📊 Endpoints para Testar

### Health & Status
```bash
GET  http://localhost:8080/health
GET  http://localhost:8080/api/v1/overview/status
```

### Authentication (Rate Limited - 20/min)
```bash
POST http://localhost:8080/api/v1/auth/login
POST http://localhost:8080/api/v1/auth/refresh
```

### Risk Assessment (Cached - 5min TTL)
```bash
GET  http://localhost:8080/api/v1/risks/trends
GET  http://localhost:8080/api/v1/risks/profiles
POST http://localhost:8080/api/v1/risks/assess
```

### Geospatial (Cached - 10min TTL)
```bash
POST http://localhost:8080/api/v1/geospatial/query
GET  http://localhost:8080/api/v1/geospatial/zones
```

### OSINT
```bash
GET  http://localhost:8080/api/v1/osint/analysis
GET  http://localhost:8080/api/v1/osint/signals
```

---

## 📈 Monitoramento

### Prometheus Metrics
```
http://localhost:9090
```

Queries úteis:
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Latency (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Grafana Dashboards
```
http://localhost:3001
User: admin
Pass: admin
```

### Redis Stats
```powershell
docker exec -it atlas-redis redis-cli INFO stats
docker exec -it atlas-redis redis-cli INFO keyspace
```

### Database Connections
```powershell
docker exec -it atlas-postgres psql -U atlas -d atlas -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🎯 Checklist Final

Antes de considerar deploy completo:

- [ ] Todos os serviços rodando (`docker-compose ps` - todos "Up")
- [ ] Migrations aplicadas (tabelas criadas)
- [ ] Health check OK (200)
- [ ] Rate limiting funcionando (429 após limite)
- [ ] CORS headers corretos
- [ ] Security headers presentes
- [ ] GZip compression ativa
- [ ] Cookies httpOnly configurados
- [ ] Cache funcionando (X-Cache: HIT/MISS)
- [ ] Testes passando (`make test`)
- [ ] Backup automático configurado
- [ ] Logs estruturados visíveis

---

## 📞 Suporte

**Documentação completa:**
- [IMPROVEMENTS_IMPLEMENTED.md](IMPROVEMENTS_IMPLEMENTED.md) - Lista completa de melhorias
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Frontend e arquitetura
- [README.md](README.md) - Visão geral do projeto

**Scripts úteis:**
- `validate-improvements.ps1` - Validação automática
- `deploy.ps1` - Deploy e monitoramento
- `Makefile` - Comandos de build e migrations

---

**Status:** ✅ Ready for Deployment

Tempo estimado de deploy: **3-5 minutos** ⚡
