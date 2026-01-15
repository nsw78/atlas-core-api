# ATLAS Frontend Architecture

## Overview

Executive-grade Strategic Intelligence Platform frontend built with Next.js 14, React, and TypeScript.

## Structure

```
app/
├── page.tsx              # Home/Overview
├── entities/             # Strategic Entity Workspace
├── risks/                # Risk Intelligence Dashboard
├── scenarios/            # Scenario Simulation
├── geospatial/           # Geospatial Intelligence
├── intelligence/         # OSINT Intelligence Feed
└── compliance/           # Compliance & Governance

components/
├── Header.tsx            # Navigation header
├── PlatformStatus.tsx    # Platform status indicator
├── StrategicKPIs.tsx     # Key performance indicators
├── ActiveSignalsSummary.tsx
├── QuickAccessPanel.tsx
├── EntitySelector.tsx
├── EntityIntelligenceView.tsx
├── RiskDashboard.tsx
├── RiskDimensionChart.tsx
├── RiskTimeline.tsx
├── RiskFactorsList.tsx
├── ScenarioList.tsx
├── ScenarioBuilder.tsx
├── GeospatialMap.tsx
├── OSINTFeed.tsx
├── OSINTQuery.tsx
├── ComplianceAuditView.tsx
└── DataLineageView.tsx

lib/
├── types.ts              # TypeScript type definitions
└── api/
    └── client.ts         # Centralized API client
```

## API Integration

All pages use the centralized `apiClient` from `lib/api/client.ts`:
- Type-safe API calls
- Automatic error handling
- Token management
- Consistent response format

## Design Principles

1. **Strategic First**: Every component supports executive decision-making
2. **No Placeholders**: All screens show real or meaningful content
3. **API-Driven**: No hardcoded data, all from API
4. **Type-Safe**: Full TypeScript coverage
5. **Extensible**: Easy to add new pages and features

## Navigation Flow

```
Home → Entities → Risk Profile
Home → Risks → Risk Dashboard
Home → Scenarios → Scenario Builder → Results
Home → Geospatial → Map View
Home → Intelligence → OSINT Feed
Home → Compliance → Audit Trail
```

## Next Steps

1. Add Mapbox GL JS for geospatial visualization
2. Implement WebSocket for real-time updates
3. Add chart library (Recharts) for risk visualization
4. Complete authentication flow
5. Add data export functionality
