// Re-export unified API client
export { api, ApiError } from './apiClient';
export type { RequestOptions } from './apiClient';

// Re-export typed endpoint namespaces
export {
  auth,
  risk,
  scenarios,
  sanctions,
  trade,
  compliance,
  geospatial,
  news,
  graph,
  threats,
  overview,
  analytics,
  settings,
  reports,
  simulations,
} from './endpoints';

// Re-export commonly used types from endpoints
export type {
  PaginatedList,
  PaginationParams,
  LoginRequest,
  RegisterRequest,
  AuthTokens,
  UserProfile,
  RiskAssessment,
  RiskDimension,
  RiskFactor,
  RiskAlert,
  Scenario,
  SimulationResult,
  SanctionsScreenRequest,
  SanctionsScreenResult,
  SanctionsMatch,
  SanctionsList,
  SanctionedCountry,
  SanctionsStats,
  TradeIntelligence,
  TradeIntelligenceRequest,
  TradePartner,
  TradeRestriction,
  TradeCommodity,
  SpatialQuery,
  Zone,
  SupplyChain,
  SupplyChainNode,
  GraphEntity,
  GraphRelationship,
  GraphCommunity,
  ServiceStatus,
  PlatformStatus,
  NewsArticle,
  OsintSignal,
  Threat,
  ThreatActor,
  IOC,
  Report,
  ReportTemplate,
  UserSettings,
  SystemConfig,
} from './endpoints';

// Legacy re-exports – keep existing per-domain SDK modules working
export { authApi } from './authApi';
export { riskApi } from './riskApi';
export { graphApi } from './graphApi';
export { simulationApi } from './simulationApi';
export { geospatialApi } from './geospatialApi';
export { platformApi } from './platformApi';
export { sanctionsApi } from './sanctionsApi';
