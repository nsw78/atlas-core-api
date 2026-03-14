# ATLAS - Referência Rápida para Desenvolvedores

## 🚀 Quick Start (5 minutos)

```powershell
cd c:\Users\t.nwa_tfsports\Documents\Projetos_IA\atlas-core-api

# 1. Start MVP
.\deploy.ps1 -Action start -Environment mvp

# 2. Aguarde 30-45 segundos

# 3. Acesse
# Frontend: http://localhost:3000
# API: http://localhost:8080
# Grafana: http://localhost:3005 (admin/admin)
```

---

## 📁 Estrutura Rápida

```
atlas-core-api/
├── services/frontend/                 # Frontend Next.js
│   ├── app/dashboard/page.tsx         # Dashboard page
│   ├── components/
│   │   ├── layouts/DashboardLayout    # Layout principal
│   │   ├── dashboard/                 # Dashboard widgets
│   │   └── gis/MapboxMap              # Mapa interativo
│   ├── store/                         # Zustand stores
│   ├── services/                      # API calls
│   ├── hooks/                         # Custom hooks
│   ├── types/                         # TypeScript types
│   └── Dockerfile                     # Multi-stage build
│
├── docker-compose.mvp.yml             # MVP (5 serviços)
├── docker-compose.yml                 # Full stack (30+ serviços)
├── deploy.ps1                         # Script de deployment
│
└── docs/
    ├── FRONTEND_ARCHITECTURE_STRATEGIC.md
    ├── ENDPOINT_OPTIMIZATION.md
    └── SETUP_GUIDE.md
```

---

## 🔧 Comandos Essenciais

### Deployment

```powershell
# Start
.\deploy.ps1 -Action start

# Stop
.\deploy.ps1 -Action stop

# Restart
.\deploy.ps1 -Action restart

# Ver status
.\deploy.ps1 -Action status

# Ver logs
.\deploy.ps1 -Action logs -Follow

# Limpar tudo
.\deploy.ps1 -Action clean

# Performance
.\deploy.ps1 -Action performance
```

### Docker Compose Direto

```powershell
# Start
docker compose -f docker-compose.mvp.yml up -d

# Stop
docker compose -f docker-compose.mvp.yml stop

# Logs
docker compose -f docker-compose.mvp.yml logs -f

# Exec em container
docker compose -f docker-compose.mvp.yml exec frontend sh

# Remover tudo
docker compose -f docker-compose.mvp.yml down -v
```

---

## 💻 Desenvolvimento Frontend Local

```powershell
# Instalar dependências
cd services/frontend
pnpm install

# Dev mode
pnpm dev
# Acesso: http://localhost:3000

# Build
pnpm build

# Production
pnpm start

# Lint
pnpm lint

# Type check
pnpm type-check
```

---

## 🛠️ Stack Completo

| Camada | Tecnologia | Porta | Propósito |
|--------|-----------|-------|----------|
| Frontend | Next.js 14 + React 18 | 3000 | UI/UX |
| State | Zustand | - | Estado global |
| API Client | Axios + React Query | - | Fetch dados |
| Backend | Python FastAPI | 8080 | API Gateway |
| Database | PostgreSQL | 5432 | Dados |
| Cache | Redis | 6379 | Performance |
| Maps | Mapbox GL | - | GIS |
| Charts | Recharts | - | Gráficos |
| Auth | NextAuth.js | - | Autenticação |
| Real-time | Socket.io | - | Live updates |
| Monitoring | Prometheus | 9090 | Métricas |
| Dashboard | Grafana | 3005 | Visualização |

---

## 🎯 Arquitetura em Camadas

```
┌─────────────────────────────────────┐
│      Presentation Layer             │
│  (Pages, Components, Layouts)       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│      Container Layer                │
│  (Logic, Data fetching)             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│      Component Layer                │
│  (Presentational, Reusable)         │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│      State Management               │
│  (Zustand + React Query)            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│      Services Layer                 │
│  (API calls, WebSocket)             │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│      Backend APIs                   │
│  (REST, GraphQL, WebSocket)         │
└─────────────────────────────────────┘
```

---

## 📊 Stores Disponíveis

```typescript
import { 
  useAppStore,
  useUserStore, 
  useGISStore, 
  useDashboardStore,
  useNotificationStore 
} from '@/store';

// App state
const { theme, sidebarOpen, toggleSidebar } = useAppStore();

// User/Auth
const { user, isAuthenticated, logout } = useUserStore();

// GIS
const { filters, data, selectedFeature } = useGISStore();

// Dashboard
const { kpis, alerts, addAlert } = useDashboardStore();

// Notifications
const { addNotification } = useNotificationStore();
```

---

## 🪝 Hooks Disponíveis

```typescript
import { useGIS, useDashboard, useRealtimeUpdates } from '@/hooks';

// GIS data
const { data, isLoading, error, refetch } = useGIS();

// Dashboard with auto-refresh
const { data, isLoading, error } = useDashboard();

// Real-time updates
useRealtimeUpdates();
```

---

## 🔌 Services Disponíveis

```typescript
import { fetchGISData, fetchAlerts, fetchDashboardData } from '@/services';

// GIS
const data = await fetchGISData(filters);
const feature = await getGISFeature(id);

// Alerts
const alerts = await fetchAlerts(page, pageSize);
await resolveAlert(alertId);

// Dashboard
const dashboard = await fetchDashboardData();
const kpis = await fetchKPIs();
```

---

## 🗂️ Adicionar Novo Componente

### 1. Criar Arquivo

```typescript
// components/dashboard/NewWidget.tsx
"use client";

import { useDashboardStore } from "@/store";

export default function NewWidget() {
  const { kpis } = useDashboardStore();

  return (
    <div className="p-6 bg-slate-800 rounded-lg">
      {/* conteúdo */}
    </div>
  );
}
```

### 2. Adicionar ao Dashboard

```typescript
// app/dashboard/page.tsx
import NewWidget from "@/components/dashboard/NewWidget";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <NewWidget />
    </DashboardLayout>
  );
}
```

---

## 🔐 Adicionar Novo Endpoint

### 1. Service

```typescript
// services/myfeature.ts
import { axiosInstance } from "@/lib/axios";

export async function fetchMyData(id: string) {
  const response = await axiosInstance.get(`/api/myfeature/${id}`);
  return response.data;
}
```

### 2. Type

```typescript
// types/api.ts
export interface MyData {
  id: string;
  name: string;
  // ...
}
```

### 3. Hook

```typescript
// hooks/useMyFeature.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMyData } from "@/services";

export function useMyFeature(id: string) {
  return useQuery({
    queryKey: ["myfeature", id],
    queryFn: () => fetchMyData(id),
  });
}
```

### 4. Component

```typescript
// components/MyFeature.tsx
import { useMyFeature } from "@/hooks";

export default function MyFeature({ id }: { id: string }) {
  const { data, isLoading } = useMyFeature(id);

  if (isLoading) return <LoadingSpinner />;

  return <div>{/* render data */}</div>;
}
```

---

## 🎨 Styling com Tailwind

```typescript
// Classes úteis
className="bg-slate-800 text-white"
className="p-6 rounded-lg border border-slate-700"
className="grid grid-cols-4 gap-4"
className="flex items-center justify-between"

// Dark mode
className="dark:bg-slate-900"

// Hover
className="hover:bg-slate-700 transition-colors"

// Responsive
className="md:grid-cols-2 lg:grid-cols-4"
```

---

## 🚨 Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| Port 3000 em uso | Mudar em `docker-compose.mvp.yml` |
| API retorna 401 | Verificar token em localStorage |
| Mapa não carrega | Adicionar NEXT_PUBLIC_MAPBOX_TOKEN |
| Build muito lento | Usar `--no-cache` ou aumentar timeout |
| Container exits | Ver logs com `docker logs container-name` |

---

## 📈 Performance Tips

### Otimizações Fáceis

```typescript
// ✅ Memoizar componentes pesados
const MyComponent = memo(function MyComponent() {
  // ...
});

// ✅ Lazy load componentes grandes
const HeavyComponent = dynamic(
  () => import("./HeavyComponent"),
  { loading: () => <Skeleton /> }
);

// ✅ Cache com React Query
const { data } = useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  staleTime: 1000 * 60 * 5, // 5 min
});

// ✅ Usar useCallback para callbacks
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

---

## 📚 Documentação Completa

- **Frontend Architecture:** `docs/FRONTEND_ARCHITECTURE_STRATEGIC.md`
- **Backend Optimization:** `docs/ENDPOINT_OPTIMIZATION.md`
- **Setup & Deployment:** `SETUP_GUIDE.md`
- **Implementation Summary:** `IMPLEMENTATION_SUMMARY.md`

---

## 🆘 Precisa de Ajuda?

1. Ver logs: `.\deploy.ps1 -Action logs -Follow`
2. Check status: `.\deploy.ps1 -Action status`
3. Read docs: `docs/*.md`
4. Performance: `.\deploy.ps1 -Action performance`

---

**Última Atualização:** 20 de Janeiro de 2026  
**Status:** ✅ Production Ready
