# ATLAS - Plataforma de Inteligência Estratégica

> Transformando a complexidade global em decisões acionáveis

**🌍 Idiomas:** [English](../README.md) | [Português (BR)](#) | [Español](./README.es.md)

ATLAS é uma plataforma enterprise-grade de Inteligência Estratégica projetada para organizações que requerem análise de risco estratégico, simulação de cenários, inteligência geoespacial e suporte à decisão em tempo quase real. Construída com arquitetura cloud-native, microsserviços e AI/ML integrado.

---

## Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Estrutura Modular Refatorada](#estrutura-modular-refatorada)
- [Funcionalidades por Fase](#funcionalidades-por-fase)
- [Documentação da API](#documentação-da-api)
- [Instalação e Execução](#instalação-e-execução)
- [Resolução de Problemas](#resolução-de-problemas)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Roadmap](#roadmap)
- [Estatísticas do Projeto](#estatísticas-do-projeto)
- [Segurança](#segurança)
- [Testes](#testes)
- [Monitoramento](#monitoramento)
- [Contribuindo](#contribuindo)
- [Licença](#licença)
- [Suporte](#suporte)

---

## Visão Geral

ATLAS é uma plataforma completa de Inteligência Estratégica que oferece:

- Análise de risco multidimensional (Operacional, Financeiro, Reputacional, Geopolítico, Compliance)
- Modelos de Machine Learning para predição de risco, NLP para análise de documentos e Graph Intelligence para mapeamento de relacionamentos
- Simulação de cenários (Monte Carlo e agent-based modeling)
- Digital Twins de infraestrutura, supply chain e sistemas econômicos
- Compliance automatizado (Policy-as-Code, auditoria contínua, geração de evidências)
- Arquitetura multi-região com foco em resiliência, escalabilidade e governança de dados

---

## Arquitetura

### Visão em Camadas

1. **User Layer**: Dashboards executivos, analistas, APIs externas
2. **Decision & Intelligence Layer**: Motor de risco, simulações, explicabilidade (XAI)
3. **AI & Analytics Core**: Modelos de ML, Graph AI, forecasting, NLP
4. **Geospatial & Temporal Intelligence**: PostGIS, séries temporais, mapas de supply chain
5. **Data Ingestion & OSINT**: Coleta de dados públicos, legais e licenciados

### Stack Tecnológico (principal)

- **Backend**: Go (Gin), Python (FastAPI)
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Dados**: PostgreSQL, PostGIS, Neo4j, Redis
- **Mensageria**: Kafka
- **ML/AI**: MLflow, XGBoost, LSTM, Transformers
- **Observability**: Prometheus, Grafana, logs estruturados
- **Infra**: Docker, Docker Compose (Kubernetes planejado)

---

## Estrutura Modular Refatorada

Os serviços em Go foram refatorados para uma arquitetura em camadas bem definida, preservando **100% dos contratos de API**:

```text
services/{service-name}/
   cmd/
      main.go                # Entry point do serviço
   internal/
       api/                   # Camada de transporte (HTTP)
          handlers/          # Handlers HTTP (Gin)
          middleware/        # Autenticação, logging, etc.
       application/           # Casos de uso / Application services
       domain/                # Entidades de domínio e interfaces
       infrastructure/        # Infra (config, DB, Kafka, Neo4j, etc.)
           config/
           repository/
           messaging/
           graphdb/
```

### Serviços Go refatorados

- api-gateway
- ingestion
- normalization
- audit-logging
- risk-assessment
- iam
- graph-intelligence

Principais objetivos da refatoração:

- Separação clara de responsabilidades por camada
- Manter contratos HTTP e payloads existentes
- Facilitar testes unitários e de integração
- Reduzir acoplamento entre serviços
- Preparar o código para crescimento e auditoria

---

## Funcionalidades por Fase

### Fase 1 — Foundation & Core Services

- Data Ingestion (NewsAPI, RSS, fontes sintéticas)
- Data Normalization e controle de qualidade de dados
- Risk Assessment multidimensional
- Audit Logging e trilha de auditoria
- IAM (Identity & Access Management)

### Fase 2 — Enhanced Analytics

- ML Infrastructure (MLflow, experiment tracking)
- NLP Service (NER, Sentiment, Classification, Summarization)
- Graph Intelligence (Neo4j, centralidade, comunidades, caminhos)
- Explainable AI (XAI)
- Model Serving & Monitoring

### Fase 3 — Decision Support

- Scenario Simulation (Monte Carlo, agent-based)
- Defensive War-Gaming
- Digital Twins
- Policy Impact Analysis

### Fase 4 — Strategic Platform

- Multi-Region Architecture
- Data Residency Controls
- Federated Learning
- Mobile API
- Compliance Automation

### Fase 5 — Optimization

- Performance Optimization
- Cost Optimization
- Advanced R&D
- Security Certification (ISO 27001, SOC 2)
- Continuous Improvement

---

## Documentação da API

### Base URL

```text
http://localhost:8080/api/v1
```

### Autenticação

Autenticação via OAuth2/OIDC (IAM service). Envie o token no header:

```text
Authorization: Bearer <token>
```

### Endpoints principais (via api-gateway)

#### IAM / Autenticação

| Método | Endpoint        | Descrição                     |
|--------|-----------------|-------------------------------|
| POST   | `/auth/login`   | Login de usuário              |
| POST   | `/auth/logout`  | Logout                        |
| POST   | `/auth/refresh` | Refresh de token              |
| GET    | `/users/me`     | Dados do usuário autenticado  |

#### Data Ingestion

| Método | Endpoint                          | Descrição                     |
|--------|-----------------------------------|-------------------------------|
| GET    | `/ingestion/sources`              | Lista fontes de dados         |
| POST   | `/ingestion/sources`              | Cria nova fonte               |
| GET    | `/ingestion/sources/:id`          | Detalhes da fonte             |
| POST   | `/ingestion/sources/:id/data`     | Envia dados para ingestão     |
| POST   | `/ingestion/sources/:id/trigger`  | Dispara ingestão manual       |
| GET    | `/ingestion/status`               | Status geral da ingestão      |

#### Data Normalization

| Método | Endpoint                           | Descrição              |
|--------|------------------------------------|------------------------|
| GET    | `/normalization/rules`             | Lista regras           |
| POST   | `/normalization/rules`             | Cria regra             |
| GET    | `/normalization/rules/:id`         | Detalha regra          |
| PUT    | `/normalization/rules/:id`         | Atualiza regra         |
| DELETE | `/normalization/rules/:id`         | Remove regra           |
| GET    | `/normalization/quality/:data_id`  | Qualidade de um dataset|
| GET    | `/normalization/stats`             | Estatísticas agregadas |

#### Risk Assessment

| Método | Endpoint                       | Descrição                           |
|--------|--------------------------------|-------------------------------------|
| POST   | `/risks/assess`                | Avalia risco de uma entidade        |
| GET    | `/risks/:id`                   | Consulta avaliação específica       |
| GET    | `/risks/trends`                | Tendências de risco                 |
| GET    | `/risks/entities/:entity_id`   | Avaliações por entidade             |
| POST   | `/risks/alerts`                | Configura alertas de risco          |
| GET    | `/risks/profiles`              | Perfis de risco executivos          |

> Nota: O arquivo `services/api-gateway/internal/api/router/routes.go` contém o roteamento completo de todos os endpoints expostos pelo gateway.

---

## Instalação e Execução

### Pré-requisitos

- Docker Desktop (Windows/Mac) ou Docker Engine (Linux)
- Git
- Mínimo 8GB de RAM e 20GB de disco livres

### Passos rápidos

```bash
git clone https://github.com/your-org/atlas-core-api.git
cd atlas-core-api

cp .env.example .env
# edite .env com suas credenciais

docker compose up --build
```

Serviços principais:

- Frontend: `http://localhost:3000`
- API Gateway: `http://localhost:8080`
- MLflow: `http://localhost:5000`
- Neo4j Browser: `http://localhost:7474`
- Grafana: `http://localhost:3001` (admin/admin)

---

## Resolução de Problemas

### 1. Problemas de encoding no README.md

O arquivo foi regravado em **UTF-8 puro** (sem caracteres de controle).

No seu editor (VS Code / Cursor), se ainda vir caracteres estranhos:

1. Feche o `README.md`
2. Abra novamente escolhendo: **Reopen with Encoding → UTF-8**
3. Defina UTF-8 como encoding padrão do workspace, se desejar

### 2. Erros de TypeScript (ex.: `data is of type 'unknown'`)

Use *type guards* antes de acessar propriedades de respostas de API:

```ts
const data = await apiClient.getOSINTAnalysis(query)

if (data && typeof data === "object" && "signals" in data) {
  const signals = (data as { signals?: OSINTSignal[] }).signals
  onResults(Array.isArray(signals) ? signals : [])
} else {
  onResults([])
}
```

### 3. Erros de build Docker (`missing go.sum entry`, timeouts, etc.)

Para serviços em Go:

```bash
cd services/<service-name>
go clean -modcache
go mod tidy
go build ./...
```

Para limpar cache de build:

```bash
docker builder prune -a -f
docker system prune -a -f
```

Depois:

```bash
docker compose up --build
```

### 4. Porta em uso (`port is already allocated`)

No Windows (PowerShell):

```powershell
netstat -ano | findstr :8080
```

Mate o processo ou altere a porta no `docker-compose.yml`.

### 5. Serviços não se falando entre si

```bash
docker compose ps
docker compose logs <service-name>
```

Verifique:

- Nomes de serviços no `docker-compose.yml`
- Variáveis de ambiente (.env)
- Se o serviço está saudável (healthcheck)

---

## Estrutura do Projeto

```text
atlas-core-api/
   services/
      api-gateway/            # API Gateway (Go, refatorado)
      frontend/               # Next.js frontend
      ingestion/              # Data Ingestion (Go, refatorado)
      normalization/          # Data Normalization (Go, refatorado)
      risk-assessment/        # Risk Assessment (Go, refatorado)
      audit-logging/          # Audit Logging (Go, refatorado)
      iam/                    # Identity & Access Management (Go, refatorado)
      graph-intelligence/     # Graph Intelligence (Go, refatorado)
      ml-infrastructure/      # Infraestrutura de ML (Python)
      nlp-service/            # Serviços de NLP (Python)
      [... 17+ serviços Python ...]
   docs/
      PHASE_1_MVP.md
      PHASE_2_ANALYTICS.md
      PHASE_3_DECISION_SUPPORT.md
      PHASE_4_STRATEGIC_PLATFORM.md
      PHASE_5_OPTIMIZATION.md
      AI_ML_STRATEGY.md
      README.pt-BR.md         # README em Português
      README.es.md            # README em Espanhol
   docker-compose.yml
   README.md
```

---

## Roadmap

- Fase 1 — Foundation: serviços core, ingestão, normalização, risco, audit, IAM
- Fase 2 — Enhanced Analytics: ML infra, NLP, Graph, XAI, model serving/monitoring
- Fase 3 — Decision Support: simulações, war-gaming, digital twins, policy impact
- Fase 4 — Strategic Platform: multi-region, data residency, mobile, compliance automation
- Fase 5 — Optimization: performance, custo, certificações e melhoria contínua

---

## Estatísticas do Projeto

| Métrica                   | Valor         |
|---------------------------|---------------|
| Total de serviços         | 24            |
| Serviços Go refatorados   | 7             |
| Serviços Python           | 17            |
| Total de endpoints (API)  | 150+          |
| Linguagens principais     | Go, Python, TS|

---

## Segurança

Principais princípios de segurança:

- Zero-Trust Architecture
- Autenticação OAuth2/OIDC e IAM dedicado
- RBAC/ABAC para autorização
- Criptografia em trânsito (TLS) e em repouso (planejado)
- Gerenciamento de segredos (Vault/KMS — planejado)
- Audit logging centralizado e imutável
- Foco em conformidade (GDPR, LGPD, ISO 27001, SOC 2)

---

## Testes

```bash
# Testes Go (dentro do serviço)
cd services/ingestion
go test ./...

# Testes Python (serviços de ML/NLP)
cd services/nlp-service
pytest
```

---

## Monitoramento

- Métricas: Prometheus
- Dashboards: Grafana
- Logs: JSON estruturado
- Tracing distribuído: OpenTelemetry (planejado)

---

## Contribuindo

1. Faça um fork do repositório
2. Crie uma branch de feature (`git checkout -b feature/minha-feature`)
3. Faça commits pequenos e bem descritos
4. Abra um Pull Request com descrição clara (escopo, motivação, testes)

---

## Licença

Projeto licenciado sob **MIT**. Veja o arquivo `LICENSE`.

---

## Suporte

- Documentação: diretório `docs/`
- Issues: GitHub Issues do repositório
- Contato: `support@atlas-platform.com`

---

**ATLAS** - Plataforma de Inteligência Estratégica
