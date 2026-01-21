// ATLAS Frontend - Type Definitions
// Enterprise-grade TypeScript types for strategic intelligence platform

// ============================================
// USER & AUTHENTICATION
// ============================================
export type UserRole = "executive" | "analyst" | "operator" | "auditor";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  organization: string;
  avatar?: string;
  lastLogin: string;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============================================
// API RESPONSES
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// DASHBOARD & KPIs
// ============================================
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type TrendDirection = "up" | "down" | "stable";
export type ServiceStatus = "operational" | "degraded" | "offline";

export interface KPI {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: TrendDirection;
  trendValue: number;
  status: RiskLevel;
  description: string;
}

export interface Alert {
  id: string;
  type: "warning" | "critical" | "info";
  title: string;
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

export interface DashboardData {
  kpis: KPI[];
  alerts: Alert[];
  riskScore: number;
  lastUpdated: string;
}

// ============================================
// RISK ASSESSMENT
// ============================================
export type RiskDimension =
  | "geopolitical"
  | "economic"
  | "technological"
  | "infrastructure"
  | "climate";

export interface RiskScore {
  dimension: RiskDimension;
  score: number;
  confidence: number;
  trend: TrendDirection;
  factors: RiskFactor[];
}

export interface RiskFactor {
  id: string;
  name: string;
  impact: number;
  probability: number;
  description: string;
  sources: string[];
}

export interface RiskAssessment {
  id: string;
  entityId: string;
  entityType: string;
  overallScore: number;
  confidence: number;
  dimensions: RiskScore[];
  generatedAt: string;
  validUntil: string;
  explanation: string;
}

// ============================================
// GEOSPATIAL
// ============================================
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeoFeature {
  id: string;
  type: "Point" | "Polygon" | "LineString";
  coordinates: number[] | number[][] | number[][][];
  properties: {
    name: string;
    category: string;
    riskLevel: RiskLevel;
    status: ServiceStatus;
    metadata?: Record<string, unknown>;
  };
}

export interface GeoLayer {
  id: string;
  name: string;
  type: "infrastructure" | "energy" | "logistics" | "risk-zones";
  visible: boolean;
  opacity: number;
  features: GeoFeature[];
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

// ============================================
// SIMULATIONS & SCENARIOS
// ============================================
export type ScenarioType =
  | "economic"
  | "infrastructure"
  | "supply_chain"
  | "policy"
  | "climate";

export type ScenarioStatus =
  | "draft"
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface ScenarioParameter {
  key: string;
  label: string;
  type: "number" | "string" | "boolean" | "select";
  value: unknown;
  options?: { label: string; value: unknown }[];
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  status: ScenarioStatus;
  parameters: ScenarioParameter[];
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

export interface ScenarioResult {
  scenarioId: string;
  impacts: {
    economic?: number;
    social?: number;
    environmental?: number;
    infrastructure?: number;
  };
  timeline: {
    day: number;
    description: string;
    impactScore: number;
  }[];
  recommendations: string[];
  confidence: number;
}

// ============================================
// EXPLAINABLE AI (XAI)
// ============================================
export interface ModelExplanation {
  modelId: string;
  modelName: string;
  version: string;
  confidence: number;
  factors: {
    name: string;
    contribution: number;
    description: string;
  }[];
  dataSources: {
    name: string;
    type: string;
    lastUpdated: string;
    reliability: number;
  }[];
  methodology: string;
  limitations: string[];
}

// ============================================
// AUDIT & COMPLIANCE
// ============================================
export type AuditAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "export"
  | "simulate";

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceStatus {
  framework: "GDPR" | "LGPD" | "SOC2" | "ISO27001";
  status: "compliant" | "non-compliant" | "review-required";
  lastAudit: string;
  nextAudit: string;
  findings: number;
}

// ============================================
// PLATFORM STATUS
// ============================================
export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number;
  uptime: number;
  lastCheck: string;
}

export interface PlatformStatus {
  overall: ServiceStatus;
  services: ServiceHealth[];
  compliance: ComplianceStatus[];
  timestamp: string;
}

// ============================================
// ANALYTICS & TIME SERIES
// ============================================
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  metric: string;
  unit: string;
  data: TimeSeriesPoint[];
  aggregation: "sum" | "avg" | "min" | "max";
}

export interface AnalyticsFilter {
  startDate: string;
  endDate: string;
  regions?: string[];
  sectors?: string[];
  riskLevels?: RiskLevel[];
}
