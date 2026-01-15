# ATLAS - Quick Reference Guide

## 🚀 Início Rápido

```powershell
# Build e start
docker-compose build
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar tudo
docker-compose down
```

## 📍 URLs Importantes

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## 🔌 Endpoints Principais

### Ingestion
```bash
# Listar fontes
GET /api/v1/ingestion/sources

# Registrar fonte
POST /api/v1/ingestion/sources
Body: {"name": "...", "type": "news_api|rss|synthetic", "config": {...}}

# Trigger ingestão
POST /api/v1/ingestion/sources/:id/trigger

# Status
GET /api/v1/ingestion/status
```

### Risk Assessment
```bash
# Avaliar risco
POST /api/v1/risks/assess
Body: {"entity_id": "...", "entity_type": "...", "dimensions": [...]}

# Tendências
GET /api/v1/risks/trends?entity_id=...&period=30d

# Configurar alerta
POST /api/v1/risk/alerts
Body: {"entity_id": "...", "dimension": "...", "threshold": 0.7, "condition": "above"}
```

### Normalization
```bash
# Listar regras
GET /api/v1/normalization/rules

# Estatísticas
GET /api/v1/normalization/stats
```

### Audit
```bash
# Query logs
GET /api/v1/audit/logs?user_id=...&start_date=...

# Compliance report
GET /api/v1/audit/compliance/report
```

## 📄 Páginas Frontend

- `/` - Overview
- `/ingestion` - Data Ingestion
- `/normalization` - Normalization
- `/risks` - Risk Dashboard
- `/alerts` - Risk Alerts
- `/entities` - Entity Workspace
- `/scenarios` - Scenarios
- `/compliance` - Compliance

## 🔧 Comandos Úteis

```powershell
# Rebuild específico
docker-compose build --no-cache frontend

# Ver logs de um serviço
docker-compose logs -f ingestion-service

# Restart serviço
docker-compose restart ingestion-service

# Ver status
docker-compose ps
```

## 📚 Documentação

- `docs/PHASE_1_MVP.md` - Especificação completa
- `PHASE1_COMPLETE.md` - Guia de uso
- `FASE1_SUMMARY.md` - Resumo executivo
- `IMPROVEMENTS_COMPLETE.md` - Melhorias implementadas

---

**ATLAS - Strategic Intelligence Platform**
