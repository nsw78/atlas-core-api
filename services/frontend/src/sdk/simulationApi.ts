import api from './apiClient';

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

export const simulationApi = {
  create: (data: { name: string; type: string; parameters: Record<string, unknown> }) =>
    api.post<Scenario>('/simulations/scenarios', data),
  getById: (id: string) => api.get<Scenario>(`/simulations/${id}`),
  getResults: (id: string) => api.get<SimulationResult>(`/simulations/${id}/results`),
  compare: (ids: string[]) => api.post('/simulations/compare', { scenario_ids: ids }),
};
