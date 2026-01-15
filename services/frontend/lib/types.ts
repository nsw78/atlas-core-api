// ATLAS Core Data Types
// Strategic Intelligence Platform Type Definitions

export type EntityType = 'country' | 'region' | 'organization' | 'supply_chain' | 'infrastructure'

export type RiskDimension = 'geopolitical' | 'economic' | 'technological' | 'infrastructure' | 'climate'

export type TrendDirection = 'increasing' | 'stable' | 'decreasing'

export interface StrategicEntity {
  id: string
  name: string
  type: EntityType
  aliases?: string[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface RiskDimensionScore {
  name: RiskDimension
  score: number // 0.0 - 1.0
  trend: TrendDirection
  key_factors: string[]
  confidence: number
}

export interface RiskFactor {
  id: string
  name: string
  impact: number
  source: string
  source_id: string
  description?: string
}

export interface RiskAssessment {
  id: string
  entity_id: string
  entity_type: EntityType
  overall_score: number
  confidence: number
  dimensions: Record<string, RiskDimensionScore>
  factors: RiskFactor[]
  timestamp: string
  valid_until: string
  explanation?: string
}

export interface RiskProfile {
  id: string
  entity_id: string
  name: string
  summary: string
  current_assessment: RiskAssessment
  historical_trends: RiskTrend[]
  alerts: RiskAlert[]
  created_at: string
  updated_at: string
}

export interface RiskTrend {
  date: string
  score: number
  confidence: number
  dimension?: RiskDimension
}

export interface RiskAlert {
  id: string
  entity_id: string
  dimension: RiskDimension
  threshold: number
  current_value: number
  triggered_at: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface Scenario {
  id: string
  name: string
  description: string
  model_type: 'economic' | 'infrastructure' | 'supply_chain' | 'policy' | 'climate'
  parameters: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed'
  results?: ScenarioResults
  created_at: string
  completed_at?: string
}

export interface ScenarioResults {
  economic_impact?: {
    gdp_impact_percent: number
    affected_sectors: string[]
    estimated_loss_usd: number
  }
  infrastructure_impact?: {
    affected_facilities: number
    critical_paths_disrupted: number
    estimated_restoration_hours: number
  }
  timeline: ScenarioTimelineEvent[]
  recommendations: string[]
}

export interface ScenarioTimelineEvent {
  day: number
  events: string[]
  impact_score: number
}

export interface OSINTSignal {
  id: string
  title: string
  summary: string
  source: string
  source_credibility: number
  published_at: string
  entities: string[]
  sentiment: number
  confidence: number
  relevance_score: number
  url?: string
}

export interface OSINTAnalysis {
  query: string
  signals: OSINTSignal[]
  total_count: number
  time_range: {
    start: string
    end: string
  }
  aggregated_insights: string[]
}

export interface GeospatialContext {
  entity_id: string
  location: {
    type: 'Point' | 'Polygon'
    coordinates: number[][]
  }
  zones: GeospatialZone[]
  nearby_infrastructure: InfrastructureNode[]
  supply_chain_nodes: SupplyChainNode[]
}

export interface GeospatialZone {
  type: 'eez' | 'airspace' | 'territorial'
  country: string
  geometry: {
    type: string
    coordinates: number[][]
  }
}

export interface InfrastructureNode {
  id: string
  name: string
  type: string
  location: {
    lat: number
    lon: number
  }
  status: 'operational' | 'degraded' | 'offline'
  criticality: 'low' | 'medium' | 'high' | 'critical'
}

export interface SupplyChainNode {
  id: string
  name: string
  type: 'origin' | 'transit' | 'destination'
  location: {
    lat: number
    lon: number
  }
  connections: string[]
}

export interface ExecutiveBriefing {
  id: string
  title: string
  summary: string
  entity_id?: string
  risk_summary: {
    overall_score: number
    key_risks: string[]
    trends: string[]
  }
  intelligence_highlights: string[]
  recommendations: string[]
  generated_at: string
  valid_until: string
}

export interface PlatformStatus {
  platform: 'operational' | 'degraded' | 'offline'
  services: Record<string, 'operational' | 'degraded' | 'offline'>
  compliance: {
    gdpr: 'compliant' | 'non-compliant'
    lgpd: 'compliant' | 'non-compliant'
  }
  timestamp: string
}

export interface PlatformKPI {
  active_entities: number
  risk_assessments_today: number
  osint_signals_today: number
  active_scenarios: number
  high_risk_alerts: number
  data_sources_active: number
}

export interface ComplianceAudit {
  id: string
  audit_type: 'data_access' | 'model_decision' | 'policy_change' | 'data_deletion'
  entity_id?: string
  user_id: string
  action: string
  timestamp: string
  metadata: Record<string, any>
}

export interface DataLineage {
  data_id: string
  source: string
  transformations: DataTransformation[]
  consumers: string[]
  retention_policy: string
  compliance_status: 'compliant' | 'review_required'
}

export interface DataTransformation {
  step: number
  operation: string
  timestamp: string
  service: string
  input_data_id: string
  output_data_id: string
}
