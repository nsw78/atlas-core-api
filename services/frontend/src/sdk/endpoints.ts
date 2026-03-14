// ATLAS SDK – Typed API Endpoint Functions
// Organized by backend service domain. Every function returns a typed Promise.

import api from './apiClient';

// ============================================================================
// Shared / Generic Types
// ============================================================================

/** Standard paginated envelope returned by list endpoints. */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

// ============================================================================
// AUTH
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  permissions: string[];
  active: boolean;
  mfa_enabled: boolean;
}

export const auth = {
  login: (data: LoginRequest) =>
    api.post<AuthTokens>('/auth/login', data, { skipAuth: true }),

  logout: () =>
    api.post<void>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    api.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken }, { skipAuth: true }),

  validateToken: () =>
    api.get<{ valid: boolean; expires_at: string }>('/auth/validate'),

  getProfile: () =>
    api.get<UserProfile>('/users/me'),
};

// ============================================================================
// RISK
// ============================================================================

export interface RiskAssessment {
  id: string;
  entity_id: string;
  entity_type: string;
  overall_score: number;
  operational_score: number;
  financial_score: number;
  reputational_score: number;
  geopolitical_score: number;
  compliance_score: number;
  dimensions: RiskDimension[];
  created_at: string;
}

export interface RiskDimension {
  name: string;
  score: number;
  weight: number;
  factors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  score: number;
  source: string;
  confidence: number;
}

export interface RiskAlert {
  id: string;
  assessment_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  is_resolved: boolean;
  created_at: string;
}

export interface RiskTrend {
  date: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
}

export interface RiskProfile {
  id: string;
  entity_id: string;
  entity_type: string;
  name: string;
  overall_score: number;
  last_assessed: string;
}

export interface CreateAssessmentRequest {
  entity_id: string;
  entity_type: string;
}

export const risk = {
  getAssessments: (params?: PaginationParams & { entity_type?: string }) =>
    api.get<PaginatedList<RiskAssessment>>('/risks/assessments', params),

  createAssessment: (data: CreateAssessmentRequest) =>
    api.post<RiskAssessment>('/risks/assess', data),

  getAlerts: (params?: PaginationParams & { severity?: string; resolved?: boolean }) =>
    api.get<RiskAlert[]>('/risks/alerts', params),

  getTrends: (params?: { entity_id?: string; period?: string }) =>
    api.get<RiskTrend[]>('/risks/trends', params),

  getProfiles: (params?: PaginationParams) =>
    api.get<PaginatedList<RiskProfile>>('/risks/profiles', params),
};

// ============================================================================
// SCENARIOS / SIMULATIONS (scenario-runner service)
// ============================================================================

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: SimulationResult;
  created_at: string;
}

export interface SimulationResult {
  simulation_id: string;
  iterations: number;
  mean_impact: number;
  median_impact: number;
  std_deviation: number;
  percentile_95: number;
  percentile_99: number;
  dimensions: Record<string, number>;
}

export interface CreateScenarioRequest {
  name: string;
  type: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ScenarioComparison {
  scenario_ids: string[];
  results: SimulationResult[];
  summary: Record<string, unknown>;
}

export const scenarios = {
  listScenarios: (params?: PaginationParams & { status?: string }) =>
    api.get<PaginatedList<Scenario>>('/simulations/scenarios', params),

  createScenario: (data: CreateScenarioRequest) =>
    api.post<Scenario>('/simulations/scenarios', data),

  runScenario: (scenarioId: string) =>
    api.post<{ job_id: string }>(`/simulations/scenarios/${scenarioId}/run`),

  getResults: (scenarioId: string) =>
    api.get<SimulationResult>(`/simulations/${scenarioId}/results`),

  compareScenarios: (scenarioIds: string[]) =>
    api.post<ScenarioComparison>('/simulations/compare', { scenario_ids: scenarioIds }),
};

// ============================================================================
// SANCTIONS
// ============================================================================

export interface SanctionsScreenRequest {
  entity_name: string;
  entity_type: 'individual' | 'organization' | 'vessel' | 'aircraft';
  country_code?: string;
  additional_info?: Record<string, string>;
}

export interface SanctionsMatch {
  list_source: string;
  list_id: string;
  matched_name: string;
  match_score: number;
  entry_type: string;
  programs: string[];
  remarks: string;
  added_date: string;
}

export interface SanctionsScreenResult {
  id: string;
  entity_name: string;
  entity_type: string;
  risk_level: 'clear' | 'review' | 'match';
  overall_score: number;
  matches: SanctionsMatch[];
  screened_lists: string[];
  screened_at: string;
  processing_time_ms: number;
}

export interface SanctionsList {
  id: string;
  name: string;
  source: string;
  source_url: string;
  last_updated: string;
  last_synced: string;
  total_entries: number;
  status: 'active' | 'syncing' | 'error';
  country: string;
}

export interface SanctionedCountry {
  country_code: string;
  country_name: string;
  flag_emoji: string;
  programs: string[];
  risk_level: 'critical' | 'high' | 'medium';
  active_since: string;
  last_updated: string;
  restrictions: string[];
}

export interface SanctionsStats {
  total_screenings: number;
  total_matches: number;
  lists_tracked: number;
  sanctioned_countries: number;
  last_sync: string;
  screenings_today: number;
  matches_today: number;
  avg_response_ms: number;
}

export const sanctions = {
  screenEntity: (data: SanctionsScreenRequest) =>
    api.post<SanctionsScreenResult>('/sanctions/screen', data),

  batchScreen: (entities: SanctionsScreenRequest[]) =>
    api.post<SanctionsScreenResult[]>('/sanctions/batch', { entities }),

  getLists: () =>
    api.get<SanctionsList[]>('/sanctions/lists'),

  getCountries: () =>
    api.get<SanctionedCountry[]>('/sanctions/countries'),

  getStats: () =>
    api.get<SanctionsStats>('/sanctions/stats'),
};

// ============================================================================
// TRADE INTELLIGENCE
// ============================================================================

export interface TradeIntelligenceRequest {
  country_from: string;
  country_to: string;
  year?: number;
  hs_code?: string;
}

export interface TradeIntelligence {
  country_from: string;
  country_to: string;
  year: number;
  total_trade_usd: number;
  exports_usd: number;
  imports_usd: number;
  trade_balance_usd: number;
  top_commodities: TradeCommodity[];
  restrictions: TradeRestriction[];
  tariff_rate_avg: number;
  risk_assessment: string;
}

export interface TradePartner {
  country_code: string;
  country_name: string;
  total_trade_usd: number;
  exports_usd: number;
  imports_usd: number;
  trade_balance_usd: number;
  rank: number;
  is_sanctioned: boolean;
}

export interface TradeRestriction {
  id: string;
  type: 'embargo' | 'tariff' | 'quota' | 'license_required' | 'prohibition';
  description: string;
  issuing_authority: string;
  effective_date: string;
  expiry_date?: string;
  affected_hs_codes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TradeCommodity {
  hs_code: string;
  description: string;
  value_usd: number;
  volume_tons: number;
  trend_pct: number;
}

export const trade = {
  getIntelligence: (data: TradeIntelligenceRequest) =>
    api.post<TradeIntelligence>('/trade/intelligence', data),

  getPartners: (countryCode: string) =>
    api.get<TradePartner[]>(`/trade/partners/${countryCode}`),

  getRestrictions: (params?: PaginationParams & { severity?: string }) =>
    api.get<TradeRestriction[]>('/trade/restrictions', params),

  getCommodities: (hsCode?: string) =>
    api.get<TradeCommodity[]>(hsCode ? `/trade/commodities/${hsCode}` : '/trade/commodities'),
};

// ============================================================================
// COMPLIANCE & AUDIT
// ============================================================================

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource: string;
  resource_id: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  metadata?: Record<string, unknown>;
}

export interface ComplianceStatus {
  framework: string;
  status: 'compliant' | 'non-compliant' | 'review-required';
  last_audit: string;
  next_audit: string;
  findings: number;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  framework: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  last_updated: string;
}

export interface ComplianceScanResult {
  id: string;
  policy_id: string;
  status: 'pass' | 'fail' | 'warning';
  findings: number;
  details: Record<string, unknown>;
  scanned_at: string;
}

export const compliance = {
  getAuditLogs: (params?: PaginationParams & { action?: string; user_id?: string }) =>
    api.get<PaginatedList<AuditLogEntry>>('/audit/logs', params),

  getComplianceStatus: () =>
    api.get<ComplianceStatus[]>('/compliance/status'),

  getPolicies: (params?: PaginationParams) =>
    api.get<PaginatedList<CompliancePolicy>>('/compliance/automation/policies', params),

  runScan: (policyId: string) =>
    api.post<ComplianceScanResult>('/compliance/automation/scan', { policy_id: policyId }),
};

// ============================================================================
// GEOSPATIAL
// ============================================================================

export interface SpatialQuery {
  type: 'radius' | 'bbox' | 'polygon';
  center?: { lat: number; lng: number };
  radius_km?: number;
  bounds?: { north: number; south: number; east: number; west: number };
  layers?: string[];
}

export interface GeoFeature {
  id: string;
  type: string;
  geometry: unknown;
  properties: Record<string, unknown>;
}

export interface Zone {
  id: string;
  name: string;
  type: string;
  geometry: unknown;
  risk_level: string;
}

export interface SupplyChain {
  id: string;
  name: string;
  nodes: SupplyChainNode[];
}

export interface SupplyChainNode {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  risk_score: number;
}

export interface GeoContext {
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  risk_factors: Record<string, unknown>;
}

export const geospatial = {
  queryFeatures: (data: SpatialQuery) =>
    api.post<GeoFeature[]>('/geospatial/query', data),

  getZones: (params?: { type?: string; risk_level?: string }) =>
    api.get<Zone[]>('/geospatial/zones', params),

  getSupplyChains: () =>
    api.get<SupplyChain[]>('/geospatial/supply-chains'),

  getContext: (lat: number, lng: number) =>
    api.post<GeoContext>('/geospatial/context', { latitude: lat, longitude: lng }),
};

// ============================================================================
// NEWS / OSINT
// ============================================================================

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  relevance_score: number;
  tags: string[];
  entities: string[];
}

export interface OsintSignal {
  id: string;
  type: string;
  source: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  entities: string[];
  detected_at: string;
  confidence: number;
}

export interface OsintAnalysis {
  id: string;
  topic: string;
  summary: string;
  signals: OsintSignal[];
  risk_assessment: string;
  generated_at: string;
}

export interface FeedItem {
  id: string;
  type: 'article' | 'signal' | 'alert';
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  severity?: string;
  url?: string;
}

export const news = {
  getArticles: (params?: PaginationParams & { query?: string; source?: string; sentiment?: string }) =>
    api.get<PaginatedList<NewsArticle>>('/news/articles', params),

  getSignals: (params?: PaginationParams & { severity?: string; type?: string }) =>
    api.get<PaginatedList<OsintSignal>>('/osint/signals', params),

  getAnalysis: (topic: string) =>
    api.get<OsintAnalysis>(`/osint/analysis/${encodeURIComponent(topic)}`),

  getFeed: (params?: PaginationParams & { type?: string }) =>
    api.get<PaginatedList<FeedItem>>('/news/feed', params),
};

// ============================================================================
// GRAPH / KNOWLEDGE GRAPH
// ============================================================================

export interface GraphEntity {
  id: string;
  name: string;
  type: string;
  risk_score: number;
  attributes: Record<string, unknown>;
}

export interface GraphRelationship {
  source_id: string;
  target_id: string;
  type: string;
  strength: number;
  metadata?: Record<string, unknown>;
}

export interface GraphCommunity {
  id: string;
  members: string[];
  cohesion: number;
  label?: string;
}

export interface CentralityResult {
  entity_id: string;
  entity_name: string;
  score: number;
  rank: number;
}

export interface GraphPath {
  nodes: GraphEntity[];
  edges: GraphRelationship[];
  total_weight: number;
}

export const graph = {
  resolveEntities: (data: { name: string; type?: string }) =>
    api.post<GraphEntity[]>('/graph/entities/resolve', data),

  getRelationships: (entityId: string, params?: { depth?: number; type?: string }) =>
    api.get<GraphRelationship[]>(`/graph/entities/${entityId}/relationships`, params),

  getCommunities: (params?: PaginationParams) =>
    api.get<GraphCommunity[]>('/graph/communities', params),

  getCentrality: (params?: { algorithm?: string; top_n?: number }) =>
    api.get<CentralityResult[]>('/graph/centrality', params),

  getPath: (sourceId: string, targetId: string) =>
    api.get<GraphPath>('/graph/path', { source: sourceId, target: targetId }),
};

// ============================================================================
// THREATS
// ============================================================================

export interface Threat {
  id: string;
  name: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  status: 'active' | 'mitigated' | 'resolved';
  first_seen: string;
  last_seen: string;
  affected_entities: string[];
}

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  origin_country: string;
  motivation: string;
  capabilities: string[];
  associated_threats: string[];
  confidence: number;
}

export interface IOC {
  id: string;
  type: string;
  value: string;
  threat_id: string;
  confidence: number;
  first_seen: string;
  last_seen: string;
  tags: string[];
}

export interface ThreatFeed {
  id: string;
  name: string;
  provider: string;
  url: string;
  status: 'active' | 'paused' | 'error';
  last_sync: string;
  total_indicators: number;
}

export const threats = {
  getThreats: (params?: PaginationParams & { severity?: string; status?: string }) =>
    api.get<PaginatedList<Threat>>('/threats', params),

  getThreatActors: (params?: PaginationParams & { type?: string }) =>
    api.get<PaginatedList<ThreatActor>>('/threats/actors', params),

  getIOCs: (params?: PaginationParams & { type?: string; threat_id?: string }) =>
    api.get<PaginatedList<IOC>>('/threats/iocs', params),

  getThreatFeeds: () =>
    api.get<ThreatFeed[]>('/threats/feeds'),
};

// ============================================================================
// OVERVIEW / PLATFORM STATUS
// ============================================================================

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  uptime: number;
  version: string;
  last_check: string;
}

export interface PlatformStatus {
  overall: 'healthy' | 'degraded' | 'down';
  services: ServiceStatus[];
  total_services: number;
  healthy_count: number;
}

export interface KPIData {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trend_value: number;
}

export interface OverviewSignal {
  id: string;
  type: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: string;
}

export const overview = {
  getPlatformStatus: () =>
    api.get<PlatformStatus>('/overview/status'),

  getKPIs: () =>
    api.get<KPIData[]>('/overview/kpis'),

  getSignals: (params?: PaginationParams & { severity?: string }) =>
    api.get<PaginatedList<OverviewSignal>>('/overview/signals', params),
};

// ============================================================================
// ANALYTICS
// ============================================================================

export interface MetricsResult {
  metrics: Record<string, number>;
  period: string;
  generated_at: string;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  metric: string;
  unit: string;
  data: TimeSeriesPoint[];
  aggregation: 'sum' | 'avg' | 'min' | 'max';
}

export interface BreakdownItem {
  label: string;
  value: number;
  percentage: number;
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
}

export interface AnalyticsFilter {
  start_date?: string;
  end_date?: string;
  regions?: string[];
  sectors?: string[];
  risk_levels?: string[];
}

export const analytics = {
  getMetrics: (filters?: AnalyticsFilter) =>
    api.post<MetricsResult>('/analytics/metrics', filters),

  getTimeSeries: (metric: string, filters?: AnalyticsFilter) =>
    api.post<TimeSeriesData>('/analytics/timeseries', { metric, ...filters }),

  getBreakdown: (dimension: string, filters?: AnalyticsFilter) =>
    api.post<BreakdownItem[]>('/analytics/breakdown', { dimension, ...filters }),

  getHeatmap: (params: { x_axis: string; y_axis: string; metric: string } & AnalyticsFilter) =>
    api.post<HeatmapCell[]>('/analytics/heatmap', params),
};

// ============================================================================
// SETTINGS
// ============================================================================

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    digest: 'none' | 'daily' | 'weekly';
  };
  dashboard: {
    default_view: string;
    auto_refresh_interval: number;
    visible_widgets: string[];
  };
}

export interface SystemConfig {
  version: string;
  environment: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  integrations: { name: string; enabled: boolean; status: string }[];
}

export const settings = {
  getUserSettings: () =>
    api.get<UserSettings>('/settings/user'),

  updateSettings: (data: Partial<UserSettings>) =>
    api.put<UserSettings>('/settings/user', data),

  getSystemConfig: () =>
    api.get<SystemConfig>('/settings/system'),
};

// ============================================================================
// REPORTS
// ============================================================================

export interface Report {
  id: string;
  name: string;
  type: string;
  template_id: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  format: 'pdf' | 'csv' | 'xlsx';
  download_url?: string;
  created_at: string;
  created_by: string;
  parameters: Record<string, unknown>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  formats: string[];
  parameters: { key: string; label: string; type: string; required: boolean }[];
}

export interface ScheduledReport {
  id: string;
  report_template_id: string;
  schedule: string; // cron expression
  recipients: string[];
  format: string;
  enabled: boolean;
  last_run?: string;
  next_run: string;
}

export interface CreateReportRequest {
  name: string;
  template_id: string;
  format: 'pdf' | 'csv' | 'xlsx';
  parameters?: Record<string, unknown>;
}

export interface ScheduleReportRequest {
  template_id: string;
  schedule: string;
  recipients: string[];
  format: string;
  parameters?: Record<string, unknown>;
}

export const reports = {
  listReports: (params?: PaginationParams & { status?: string; type?: string }) =>
    api.get<PaginatedList<Report>>('/reports', params),

  createReport: (data: CreateReportRequest) =>
    api.post<Report>('/reports', data),

  getTemplates: () =>
    api.get<ReportTemplate[]>('/reports/templates'),

  scheduleReport: (data: ScheduleReportRequest) =>
    api.post<ScheduledReport>('/reports/schedules', data),
};

// ============================================================================
// SIMULATIONS (high-level / advanced)
// ============================================================================

export interface Simulation {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'draft' | 'pending' | 'running' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  result?: SimulationResult;
  created_at: string;
  completed_at?: string;
  created_by: string;
}

export interface CreateSimulationRequest {
  name: string;
  description?: string;
  type: string;
  parameters: Record<string, unknown>;
}

export interface SimulationComparison {
  simulation_ids: string[];
  results: SimulationResult[];
  delta: Record<string, number>;
}

export const simulations = {
  listSimulations: (params?: PaginationParams & { status?: string; type?: string }) =>
    api.get<PaginatedList<Simulation>>('/simulations', params),

  createSimulation: (data: CreateSimulationRequest) =>
    api.post<Simulation>('/simulations', data),

  getSimulation: (id: string) =>
    api.get<Simulation>(`/simulations/${id}`),

  compareSimulations: (ids: string[]) =>
    api.post<SimulationComparison>('/simulations/compare', { simulation_ids: ids }),
};
