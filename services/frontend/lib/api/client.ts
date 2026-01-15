// ATLAS API Client
// Centralized API communication layer

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
}

class APIClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // TODO: Get token from auth context
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('atlas_token')
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const config: RequestInit = {
      method: options.method || 'GET',
      headers,
    }

    if (options.body) {
      config.body = JSON.stringify(options.body)
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.data || data
  }

  // Platform Overview
  async getPlatformStatus() {
    return this.request('/api/v1/overview/status')
  }

  async getPlatformKPIs() {
    return this.request('/api/v1/overview/kpis')
  }

  async getActiveSignals() {
    return this.request('/api/v1/overview/signals')
  }

  // Strategic Entities
  async getEntities(filters?: { type?: string; search?: string }) {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.search) params.append('search', filters.search)
    const query = params.toString()
    return this.request(`/api/v1/entities${query ? `?${query}` : ''}`)
  }

  async getEntity(id: string) {
    return this.request(`/api/v1/entities/${id}`)
  }

  async getEntityContext(entityId: string) {
    return this.request(`/api/v1/entities/${entityId}/context`)
  }

  async getEntityIntelligence(entityId: string) {
    return this.request(`/api/v1/entities/${entityId}/intelligence`)
  }

  // Risk Assessment
  async assessRisk(request: {
    entity_id: string
    entity_type: string
    dimensions?: string[]
    time_horizon?: string
  }) {
    return this.request('/api/v1/risks/assess', {
      method: 'POST',
      body: request,
    })
  }

  async getRiskAssessment(id: string) {
    return this.request(`/api/v1/risks/${id}`)
  }

  async getRiskTrends(entityId: string, dimension?: string, period?: string) {
    const params = new URLSearchParams()
    params.append('entity_id', entityId)
    if (dimension) params.append('dimension', dimension)
    if (period) params.append('period', period)
    return this.request(`/api/v1/risks/trends?${params.toString()}`)
  }

  async getRiskProfiles() {
    return this.request('/api/v1/risk-profiles')
  }

  async getRiskProfile(id: string) {
    return this.request(`/api/v1/risk-profiles/${id}`)
  }

  // Scenarios
  async createScenario(scenario: {
    name: string
    description: string
    model_type: string
    parameters: Record<string, any>
  }) {
    return this.request('/api/v1/scenarios', {
      method: 'POST',
      body: scenario,
    })
  }

  async getScenarios() {
    return this.request('/api/v1/scenarios')
  }

  async getScenario(id: string) {
    return this.request(`/api/v1/scenarios/${id}`)
  }

  async runScenario(id: string) {
    return this.request(`/api/v1/scenarios/${id}/run`, {
      method: 'POST',
    })
  }

  async getScenarioResults(id: string) {
    return this.request(`/api/v1/scenarios/${id}/results`)
  }

  // Geospatial
  async queryGeospatial(query: {
    geometry: any
    entity_types?: string[]
    filters?: Record<string, any>
  }) {
    return this.request('/api/v1/geospatial/query', {
      method: 'POST',
      body: query,
    })
  }

  async getGeospatialZones(type?: string, country?: string) {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    if (country) params.append('country', country)
    const query = params.toString()
    return this.request(`/api/v1/geospatial/zones${query ? `?${query}` : ''}`)
  }

  async getGeospatialContext(entityId: string) {
    return this.request(`/api/v1/geospatial/context?entity_id=${entityId}`)
  }

  // OSINT
  async getOSINTAnalysis(query: string, timeRange?: { start: string; end: string }) {
    return this.request('/api/v1/osint/analysis', {
      method: 'POST',
      body: { query, time_range: timeRange },
    })
  }

  async getOSINTSignals(filters?: { entity_id?: string; limit?: number }) {
    const params = new URLSearchParams()
    if (filters?.entity_id) params.append('entity_id', filters.entity_id)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    const query = params.toString()
    return this.request(`/api/v1/osint/signals${query ? `?${query}` : ''}`)
  }

  async getOSINTFeed(limit?: number) {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    const query = params.toString()
    return this.request(`/api/v1/osint/feed${query ? `?${query}` : ''}`)
  }

  // Executive Briefings
  async getBriefings() {
    return this.request('/api/v1/briefings')
  }

  async createBriefing(request: { entity_id?: string; focus_areas?: string[] }) {
    return this.request('/api/v1/briefings', {
      method: 'POST',
      body: request,
    })
  }

  async getBriefing(id: string) {
    return this.request(`/api/v1/briefings/${id}`)
  }

  // Compliance
  async getComplianceAudit(filters?: { entity_id?: string; audit_type?: string }) {
    const params = new URLSearchParams()
    if (filters?.entity_id) params.append('entity_id', filters.entity_id)
    if (filters?.audit_type) params.append('audit_type', filters.audit_type)
    const query = params.toString()
    return this.request(`/api/v1/compliance/audit${query ? `?${query}` : ''}`)
  }

  async getDataLineage(dataId: string) {
    return this.request(`/api/v1/compliance/lineage?data_id=${dataId}`)
  }

  async getComplianceStatus() {
    return this.request('/api/v1/compliance/status')
  }

  // Data Ingestion (Phase 1)
  async getIngestionSources() {
    return this.request('/api/v1/ingestion/sources')
  }

  async registerIngestionSource(source: { name: string; type: string; config?: any }) {
    return this.request('/api/v1/ingestion/sources', {
      method: 'POST',
      body: source,
    })
  }

  async getIngestionSource(id: string) {
    return this.request(`/api/v1/ingestion/sources/${id}`)
  }

  async ingestData(sourceId: string, data: any) {
    return this.request(`/api/v1/ingestion/sources/${sourceId}/data`, {
      method: 'POST',
      body: { data },
    })
  }

  async triggerIngestion(sourceId: string) {
    return this.request(`/api/v1/ingestion/sources/${sourceId}/trigger`, {
      method: 'POST',
    })
  }

  async getIngestionStatus() {
    return this.request('/api/v1/ingestion/status')
  }

  // Data Normalization (Phase 1)
  async getNormalizationRules() {
    return this.request('/api/v1/normalization/rules')
  }

  async createNormalizationRule(rule: any) {
    return this.request('/api/v1/normalization/rules', {
      method: 'POST',
      body: rule,
    })
  }

  async getNormalizationQuality(dataId: string) {
    return this.request(`/api/v1/normalization/quality/${dataId}`)
  }

  async getNormalizationStats() {
    return this.request('/api/v1/normalization/stats')
  }

  // Audit Logging (Phase 1)
  async getAuditLogs(filters?: { user_id?: string; event_type?: string; start_date?: string; end_date?: string }) {
    const params = new URLSearchParams()
    if (filters?.user_id) params.append('user_id', filters.user_id)
    if (filters?.event_type) params.append('event_type', filters.event_type)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    const query = params.toString()
    return this.request(`/api/v1/audit/logs${query ? `?${query}` : ''}`)
  }

  async getAuditLog(id: string) {
    return this.request(`/api/v1/audit/logs/${id}`)
  }

  async createAuditEvent(event: any) {
    return this.request('/api/v1/audit/events', {
      method: 'POST',
      body: event,
    })
  }

  async getComplianceReport(startDate?: string, endDate?: string) {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const query = params.toString()
    return this.request(`/api/v1/audit/compliance/report${query ? `?${query}` : ''}`)
  }

  // Risk Alerts (Phase 1)
  async configureRiskAlert(alert: { entity_id: string; dimension: string; threshold: number; condition: string }) {
    return this.request('/api/v1/risk/alerts', {
      method: 'POST',
      body: alert,
    })
  }

  async getRiskAlerts(activeOnly?: boolean) {
    const params = new URLSearchParams()
    if (activeOnly) params.append('active_only', 'true')
    const query = params.toString()
    return this.request(`/api/v1/risk/alerts${query ? `?${query}` : ''}`)
  }

  async deleteRiskAlert(id: string) {
    return this.request(`/api/v1/risk/alerts/${id}`, {
      method: 'DELETE',
    })
  }

  // Generic request method for flexibility
  async get(endpoint: string) {
    return this.request(endpoint)
  }

  async post(endpoint: string, body?: any) {
    return this.request(endpoint, { method: 'POST', body })
  }
}

export const apiClient = new APIClient(API_BASE_URL)
export { APIClient }
