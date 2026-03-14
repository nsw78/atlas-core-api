# ATLAS Frontend

## Overview

Next.js 14.2.5 web application for the ATLAS Strategic Intelligence Platform. Provides a unified interface for risk assessment, threat intelligence, geospatial analysis, sanctions screening, compliance monitoring, and simulation modeling.

| Stack          | Version  |
|----------------|----------|
| Next.js        | 14.2.5   |
| React          | 18.3.1   |
| TypeScript     | 5.5.3    |
| Tailwind CSS   | 3.4.4    |
| Zustand        | 4.5.4    |
| Recharts       | 2.12.7   |
| Framer Motion  | 11.3.8   |

## Pages

The app uses the Next.js App Router. All authenticated routes are wrapped in `MainLayout` (sidebar + header).

| Route           | Page              | Description                                                  |
|-----------------|-------------------|--------------------------------------------------------------|
| `/`             | Home              | Redirects to `/dashboard` when authenticated, `/login` otherwise |
| `/login`        | Login             | JWT authentication form with error handling                  |
| `/dashboard`    | Dashboard         | Risk overview, KPI strip, alerts feed, trend chart           |
| `/analytics`    | Analytics         | Time series, category breakdown, radar and pie charts        |
| `/threats`      | Threats           | Threat feeds, actors, IOCs                                   |
| `/simulations`  | Simulations       | Monte Carlo and agent-based scenario runner                  |
| `/geospatial`   | Geospatial        | Map visualization, supply chain routes, risk zones           |
| `/sanctions`    | Sanctions         | Entity screening, sanctioned countries, trade intelligence   |
| `/compliance`   | Compliance        | Framework status, audit log, data governance                 |
| `/reports`      | Reports           | Report center, templates, scheduling                         |
| `/settings`     | Settings          | Profile, notifications, security, API keys, appearance       |

## Architecture

### Atomic Design

Components follow the atomic design methodology:

```
src/components/
  atoms/          Badge, Button, Card
  molecules/      AlertItem, Charts, KPICard, RiskGauge, RiskHeatmap,
                  ServiceHealthGrid, ThreatTimeline
  organisms/      Sidebar, Header
  layouts/        MainLayout
```

### State Management

- **Zustand** stores for domain-specific global state (`geoStore`, `simulationStore`, `threatStore`)
- **React Context** for authentication (`AuthContext`) and internationalization (`I18nProvider`)

### Data Fetching

Custom SDK with graceful fallback to mock data when the backend is unavailable. Three-layer approach:

1. **`sdk/apiClient.ts`** -- Singleton HTTP client built on `fetch`. Handles bearer token injection, 30-second request timeout via `AbortController`, automatic 401 detection with redirect to `/login`, and structured `ApiError` objects with status, code, and details.

2. **`sdk/endpoints.ts`** -- 15 typed endpoint namespaces that cover every backend service:

   | Namespace      | Endpoints                                        |
   |----------------|--------------------------------------------------|
   | `auth`         | login, logout, refreshToken, validateToken, getProfile |
   | `risk`         | getAssessments, createAssessment, getAlerts, getTrends, getProfiles |
   | `scenarios`    | listScenarios, createScenario, runScenario, getResults, compareScenarios |
   | `sanctions`    | screenEntity, batchScreen, getLists, getCountries, getStats |
   | `trade`        | getIntelligence, getPartners, getRestrictions, getCommodities |
   | `compliance`   | getAuditLogs, getComplianceStatus, getPolicies, runScan |
   | `geospatial`   | queryFeatures, getZones, getSupplyChains, getContext |
   | `news`         | getArticles, getSignals, getAnalysis, getFeed |
   | `graph`        | resolveEntities, getRelationships, getCommunities, getCentrality, getPath |
   | `threats`      | getThreats, getThreatActors, getIOCs, getThreatFeeds |
   | `overview`     | getPlatformStatus, getKPIs, getSignals |
   | `analytics`    | getMetrics, getTimeSeries, getBreakdown, getHeatmap |
   | `settings`     | getUserSettings, updateSettings, getSystemConfig |
   | `reports`      | listReports, createReport, getTemplates, scheduleReport |
   | `simulations`  | listSimulations, createSimulation, getSimulation, compareSimulations |

3. **`hooks/useApi.ts`** -- Two React hooks that wrap the SDK:
   - `useApiQuery<T>(fetcher, deps)` -- declarative data fetching with `data`, `loading`, `error`, and `refetch`. Uses a monotonic request counter to discard stale responses.
   - `useApiMutation<T, P>(mutator)` -- imperative mutations (POST/PUT/DELETE) with managed loading and error state plus a `reset` method.

### Authentication

Handled by `AuthContext` with the following flow:

1. On mount, check `localStorage` for a stored session with a valid expiry.
2. Unauthenticated users on protected routes are redirected to `/login`.
3. Authenticated users on `/login` are redirected to `/dashboard`.
4. JWT access token is stored in `localStorage` under `atlas-auth` and attached to every SDK request as a `Bearer` header.
5. On 401 responses, the client clears the session and redirects to `/login`.
6. Logout removes the stored session and redirects to `/login`.

Public (unprotected) paths: `/login`, `/forgot-password`.

### Internationalization

Three languages supported via a custom i18n system (`src/i18n/`):

| Locale  | Language              |
|---------|-----------------------|
| `en`    | English (default)     |
| `pt-BR` | Portuguese (Brazil)  |
| `es`    | Spanish              |

Language detection priority:
1. Previously selected locale from `localStorage` (`atlas-locale` key)
2. Browser `navigator.language` (auto-detects `pt*` and `es*`)
3. Falls back to English

Translation keys use dot notation with `{{param}}` interpolation. The `LanguageSwitcher` dropdown component is available for in-app language switching.

## Design System

- **Dark mode first** -- `gray-950` backgrounds, light text
- **Glass morphism** -- `glass-card` and `glass-elevated` utility classes for frosted-glass panels
- **Subtle glow effects** and entrance animations via Framer Motion
- **Recharts** for all data visualization (line, area, bar, radar, pie)
- **Tailwind CSS** with `tailwind-merge` and `clsx` for conditional class composition

## Development

```bash
cd services/frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint
npm run type-check   # TypeScript type checking (tsc --noEmit)
```

## Environment Variables

| Variable              | Default                    | Description                  |
|-----------------------|----------------------------|------------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080`    | Backend API gateway base URL |

The SDK appends `/api/v1` to this base URL automatically.

## Project Structure

```
services/frontend/
  src/
    app/                  # Next.js App Router pages and layouts
      (auth)/login/       # Login page (route group)
      analytics/          # Analytics page
      compliance/         # Compliance page
      dashboard/          # Dashboard page
      geospatial/         # Geospatial page
      reports/            # Reports page
      sanctions/          # Sanctions page
      settings/           # Settings page
      simulations/        # Simulations page
      threats/            # Threats page
      layout.tsx          # Root layout
      page.tsx            # Home (redirect)
      providers.tsx       # Global providers (Auth, I18n, etc.)
    components/
      atoms/              # Badge, Button, Card
      molecules/          # AlertItem, Charts, KPICard, RiskGauge, RiskHeatmap,
                          # ServiceHealthGrid, ThreatTimeline
      organisms/          # Sidebar, Header
      layouts/            # MainLayout
    contexts/             # AuthContext
    data/                 # Static/mock data for development fallback
    hooks/                # useApi, useAlerts, useAutoRefresh
    i18n/                 # I18nProvider, LanguageSwitcher, locale JSON files
    sdk/                  # apiClient (HTTP), endpoints (typed API functions)
    services/             # Service-layer utilities
    store/                # Zustand stores (geo, simulation, threat)
    styles/               # Global CSS and Tailwind config
    types/                # Shared TypeScript type definitions
    utils/                # General-purpose utility functions
```
