import api from './apiClient';

export interface Entity {
  id: string;
  name: string;
  type: string;
  risk_score: number;
  attributes: Record<string, unknown>;
}

export interface Relationship {
  source_id: string;
  target_id: string;
  type: string;
  strength: number;
}

export interface Community {
  id: string;
  members: string[];
  cohesion: number;
}

export const graphApi = {
  resolveEntity: (data: { name: string; type: string }) =>
    api.post<Entity>('/graph/entities/resolve', data),
  getRelationships: (entityId: string) =>
    api.get<Relationship[]>(`/graph/entities/${entityId}/relationships`),
  getRiskPropagation: (entityId: string) =>
    api.get(`/graph/entities/${entityId}/risk-propagation`),
  getCentrality: (params?: Record<string, string>) =>
    api.get('/graph/analytics/centrality', params),
  getCommunities: () => api.get<Community[]>('/graph/analytics/communities'),
};
