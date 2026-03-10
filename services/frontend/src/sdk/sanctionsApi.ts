import api from './apiClient';

// ============================================
// SANCTIONS SCREENING TYPES
// ============================================
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

// ============================================
// TRADE INTELLIGENCE TYPES
// ============================================
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

export interface TradeCommodity {
  hs_code: string;
  description: string;
  value_usd: number;
  volume_tons: number;
  trend_pct: number;
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

// ============================================
// API CALLS
// ============================================
export const sanctionsApi = {
  // Sanctions Screening
  screen: (data: SanctionsScreenRequest) =>
    api.post<SanctionsScreenResult>('/sanctions/screen', data),
  batchScreen: (entities: SanctionsScreenRequest[]) =>
    api.post<SanctionsScreenResult[]>('/sanctions/batch', { entities }),
  getLists: () =>
    api.get<SanctionsList[]>('/sanctions/lists'),
  getCountries: () =>
    api.get<SanctionedCountry[]>('/sanctions/countries'),
  getStats: () =>
    api.get<SanctionsStats>('/sanctions/stats'),

  // Trade Intelligence
  getTradeIntelligence: (data: TradeIntelligenceRequest) =>
    api.post<TradeIntelligence>('/trade/intelligence', data),
  getTradePartners: (countryCode: string) =>
    api.get<TradePartner[]>(`/trade/partners/${countryCode}`),
  getRestrictions: (params?: Record<string, string>) =>
    api.get<TradeRestriction[]>('/trade/restrictions', params),
  getCommodity: (hsCode: string) =>
    api.get<TradeCommodity[]>(`/trade/commodities/${hsCode}`),
};
