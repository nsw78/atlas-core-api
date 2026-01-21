// ATLAS API Endpoints - Service Layer
import { apiClient } from "./client";
import type {
  DashboardData,
  RiskAssessment,
  GeoLayer,
  Scenario,
  ScenarioResult,
  AuditLog,
  PlatformStatus,
  PaginatedResponse,
  AnalyticsFilter,
  TimeSeriesData,
} from "@/types";

// ============================================
// DASHBOARD
// ============================================
export const dashboardApi = {
  getData: () => apiClient.get<DashboardData>("/api/v1/dashboard"),

  getKPIs: () => apiClient.get<DashboardData["kpis"]>("/api/v1/dashboard/kpis"),

  getAlerts: (acknowledged?: boolean) =>
    apiClient.get<DashboardData["alerts"]>(
      `/api/v1/alerts${acknowledged !== undefined ? `?acknowledged=${acknowledged}` : ""}`
    ),

  acknowledgeAlert: (alertId: string) =>
    apiClient.patch(`/api/v1/alerts/${alertId}/acknowledge`),
};

// ============================================
// RISK ASSESSMENT
// ============================================
export const riskApi = {
  getAssessment: (entityId: string) =>
    apiClient.get<RiskAssessment>(`/api/v1/risk/assessment/${entityId}`),

  getAssessments: (filters?: AnalyticsFilter) =>
    apiClient.post<PaginatedResponse<RiskAssessment>>(
      "/api/v1/risk/assessments",
      filters
    ),

  createAssessment: (entityId: string, entityType: string) =>
    apiClient.post<RiskAssessment>("/api/v1/risk/assessment", {
      entityId,
      entityType,
    }),
};

// ============================================
// GEOSPATIAL
// ============================================
export const geoApi = {
  getLayers: () => apiClient.get<GeoLayer[]>("/api/v1/geo/layers"),

  getLayer: (layerId: string) =>
    apiClient.get<GeoLayer>(`/api/v1/geo/layers/${layerId}`),

  getFeatures: (
    bounds: [number, number, number, number],
    layerTypes?: string[]
  ) =>
    apiClient.post<GeoLayer["features"]>("/api/v1/geo/features", {
      bounds,
      layerTypes,
    }),
};

// ============================================
// SIMULATIONS
// ============================================
export const simulationApi = {
  getScenarios: () =>
    apiClient.get<PaginatedResponse<Scenario>>("/api/v1/simulations/scenarios"),

  getScenario: (scenarioId: string) =>
    apiClient.get<Scenario>(`/api/v1/simulations/scenarios/${scenarioId}`),

  createScenario: (scenario: Omit<Scenario, "id" | "createdAt" | "status">) =>
    apiClient.post<Scenario>("/api/v1/simulations/scenarios", scenario),

  runScenario: (scenarioId: string) =>
    apiClient.post<{ jobId: string }>(
      `/api/v1/simulations/scenarios/${scenarioId}/run`
    ),

  getResults: (scenarioId: string) =>
    apiClient.get<ScenarioResult>(
      `/api/v1/simulations/scenarios/${scenarioId}/results`
    ),
};

// ============================================
// ANALYTICS
// ============================================
export const analyticsApi = {
  getTimeSeries: (metric: string, filters: AnalyticsFilter) =>
    apiClient.post<TimeSeriesData>("/api/v1/analytics/timeseries", {
      metric,
      ...filters,
    }),

  getMetrics: (filters: AnalyticsFilter) =>
    apiClient.post<Record<string, number>>("/api/v1/analytics/metrics", filters),
};

// ============================================
// AUDIT & COMPLIANCE
// ============================================
export const auditApi = {
  getLogs: (page = 1, pageSize = 50) =>
    apiClient.get<PaginatedResponse<AuditLog>>(
      `/api/v1/audit/logs?page=${page}&pageSize=${pageSize}`
    ),

  exportLogs: (format: "csv" | "pdf", filters?: AnalyticsFilter) =>
    apiClient.post<{ downloadUrl: string }>("/api/v1/audit/export", {
      format,
      ...filters,
    }),
};

// ============================================
// PLATFORM
// ============================================
export const platformApi = {
  getStatus: () => apiClient.get<PlatformStatus>("/api/v1/platform/status"),

  getHealth: () => apiClient.get<{ status: string }>("/api/health"),
};
