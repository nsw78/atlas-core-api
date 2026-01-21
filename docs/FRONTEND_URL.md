# ATLAS Frontend - Informações de Acesso

## 🌐 URL do Frontend

**URL Principal:** http://localhost:3000

---

## 📋 Informações do Frontend

### Tecnologias
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Server State:** React Query
- **Maps:** Mapbox GL JS
- **HTTP Client:** Axios (com withCredentials)

### Estrutura de Rotas

```
http://localhost:3000/              # Homepage
http://localhost:3000/dashboard     # Dashboard Principal
http://localhost:3000/risks         # Risk Assessment
http://localhost:3000/scenarios     # Scenario Analysis
http://localhost:3000/geospatial    # GIS Maps
http://localhost:3000/osint         # OSINT Analysis
http://localhost:3000/nlp           # NLP Insights
http://localhost:3000/ml            # ML Models
http://localhost:3000/compliance    # Compliance
http://localhost:3000/settings      # Settings
```

---

## 🔐 Autenticação

O frontend usa **httpOnly cookies** para autenticação (implementação das melhorias de segurança):

### Login
```typescript
// POST http://localhost:8080/api/v1/auth/login
{
  "username": "admin",
  "password": "password"
}

// Response: Tokens enviados como Set-Cookie headers
// access_token (httpOnly, secure, 1 hora)
// refresh_token (httpOnly, secure, 7 dias)
```

### Axios Configuration
```typescript
// services/frontend/lib/axios.ts
withCredentials: true  // Envia cookies automaticamente
```

---

## 🚀 Como Subir o Frontend

### Opção 1: Docker (Recomendado)

```powershell
# Usando docker-compose.simple.yml (já configurado)
docker-compose -f docker-compose.simple.yml up -d frontend

# Verificar status
docker ps --filter "name=atlas-frontend"

# Ver logs
docker logs -f atlas-frontend
```

### Opção 2: Desenvolvimento Local (sem Docker)

```powershell
cd services/frontend

# Instalar dependências
npm install
# OU
pnpm install

# Configurar .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# Rodar em modo dev
npm run dev
# OU
pnpm dev

# Build de produção
npm run build
npm start
```

---

## 📊 Status do Build

O build do frontend está sendo executado agora. Progresso:

1. ✅ Dockerfile criado
2. ✅ docker-compose.simple.yml atualizado
3. 🔄 Build em andamento (pode levar 3-5 minutos)
   - Instalando dependências (pnpm)
   - Building Next.js
   - Criando imagem otimizada

---

## 🔍 Verificar Status

### Verificar se o container está rodando
```powershell
docker ps --filter "name=atlas-frontend"
```

### Ver logs do build
```powershell
docker logs -f atlas-frontend
```

### Testar acesso
```powershell
curl http://localhost:3000
```

---

## 🎨 Features do Frontend

### Dashboard
- **KPIs Estratégicos**: Visualização de métricas chave
- **Active Signals**: Sinais de inteligência ativos
- **Platform Status**: Status dos serviços

### Risk Assessment
- **Risk Profiles**: Perfis de risco por país/região
- **Risk Trends**: Tendências temporais
- **Alerts**: Alertas críticos

### Geospatial
- **Interactive Maps**: Mapbox com dados geoespaciais
- **Supply Chain Routes**: Rotas de supply chain
- **Risk Zones**: Zonas de risco visualizadas

### OSINT Analysis
- **News Aggregation**: Agregação de notícias
- **Signal Analysis**: Análise de sinais
- **Sentiment Analysis**: Análise de sentimento

### NLP Insights
- **Entity Extraction**: Extração de entidades
- **Topic Modeling**: Modelagem de tópicos
- **Sentiment Trends**: Tendências de sentimento

---

## 🛠️ Troubleshooting

### Porta 3000 já está em uso
```powershell
# Parar processo na porta 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# OU mudar porta no docker-compose.simple.yml
ports:
  - "3001:3000"  # Mapear para 3001 no host
```

### Build falhou
```powershell
# Limpar cache do Docker
docker system prune -a

# Rebuild sem cache
docker-compose -f docker-compose.simple.yml build --no-cache frontend
docker-compose -f docker-compose.simple.yml up -d frontend
```

### Erro de conexão com API
```powershell
# Verificar se API Gateway está rodando
docker ps --filter "name=atlas-python-api-gateway"

# Verificar variável de ambiente
docker exec atlas-frontend env | grep NEXT_PUBLIC_API_URL

# Deve retornar: NEXT_PUBLIC_API_URL=http://localhost:8080
```

### CORS errors
```powershell
# Verificar ALLOWED_ORIGINS no .env
cat .env | grep ALLOWED_ORIGINS

# Deve incluir: http://localhost:3000
# Se não, adicionar:
echo "ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000" >> .env

# Reiniciar API Gateway
docker-compose -f docker-compose.simple.yml restart python-api-gateway
```

---

## 📦 Componentes Principais

### Layouts
- `components/layouts/DashboardLayout.tsx` - Layout principal
- `components/Sidebar.tsx` - Navegação lateral

### Dashboard
- `components/dashboard/StrategicKPIs.tsx` - KPIs
- `components/dashboard/ActiveSignalsSummary.tsx` - Sinais ativos
- `components/dashboard/PlatformStatus.tsx` - Status da plataforma

### GIS
- `components/gis/MapboxMap.tsx` - Mapas interativos
- `components/gis/SupplyChainRoutes.tsx` - Rotas

### State Management
- `store/app.ts` - Estado global da aplicação
- `store/user.ts` - Estado do usuário
- `store/dashboard.ts` - Estado do dashboard
- `store/gis.ts` - Estado GIS
- `store/notifications.ts` - Notificações

### Services (API)
- `services/auth.ts` - Autenticação
- `services/dashboard.ts` - Dashboard data
- `services/risks.ts` - Risk data
- `services/geospatial.ts` - GIS data
- `services/osint.ts` - OSINT data

---

## 🔗 Integração com Backend

### API Endpoints Usados

```typescript
// Dashboard
GET /api/v1/overview/kpis
GET /api/v1/overview/status
GET /api/v1/overview/signals

// Risk Assessment
GET /api/v1/risks/profiles
GET /api/v1/risks/trends
POST /api/v1/risks/assess

// Geospatial
POST /api/v1/geospatial/query
GET /api/v1/geospatial/zones

// OSINT
GET /api/v1/osint/analysis
GET /api/v1/osint/signals

// NLP
POST /api/v1/nlp/analyze
GET /api/v1/nlp/entities
```

---

## ✅ Checklist de Validação

Após o frontend subir, verificar:

- [ ] Container `atlas-frontend` está rodando
- [ ] http://localhost:3000 abre a homepage
- [ ] Navegação funciona entre páginas
- [ ] Login redireciona para /dashboard
- [ ] Cookies httpOnly estão sendo setados (DevTools > Application > Cookies)
- [ ] Chamadas à API funcionam (Network tab)
- [ ] CORS headers corretos (Access-Control-Allow-Origin)
- [ ] Mapbox carrega (se tiver API key configurada)

---

## 📞 Suporte

**Arquivos de Referência:**
- [services/frontend/package.json](services/frontend/package.json) - Dependências
- [services/frontend/next.config.js](services/frontend/next.config.js) - Configuração Next.js
- [services/frontend/lib/axios.ts](services/frontend/lib/axios.ts) - Configuração HTTP
- [services/frontend/ARCHITECTURE.md](services/frontend/ARCHITECTURE.md) - Documentação da arquitetura

**Logs:**
```powershell
# Logs do container
docker logs -f atlas-frontend

# Logs do build
docker logs atlas-frontend --tail 100
```

---

**Status:** 🔄 Build em andamento...

Frontend estará disponível em: **http://localhost:3000** (após build completar)

**Tempo estimado de build:** 3-5 minutos
