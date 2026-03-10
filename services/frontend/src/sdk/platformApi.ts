import api from './apiClient';

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

export const platformApi = {
  getStatus: () => api.get<PlatformStatus>('/platform/status'),
  getServices: () => api.get<ServiceStatus[]>('/platform/services'),
  getHealth: () => api.get('/health'),
};
