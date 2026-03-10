import api from './apiClient';

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

export const riskApi = {
  assess: (entityId: string, entityType: string) =>
    api.post<RiskAssessment>('/risks/assess', { entity_id: entityId, entity_type: entityType }),
  getById: (id: string) => api.get<RiskAssessment>(`/risks/${id}`),
  getTrends: (params?: Record<string, string>) => api.get<RiskAssessment[]>('/risks/trends', params),
  getByEntity: (entityId: string) => api.get<RiskAssessment[]>(`/risks/entities/${entityId}`),
  getAlerts: (params?: Record<string, string>) => api.get<RiskAlert[]>('/risks/alerts', params),
  getProfiles: () => api.get('/risks/profiles'),
};
