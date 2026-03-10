import api from './apiClient';

export interface SpatialQuery {
  type: 'radius' | 'bbox' | 'polygon';
  center?: { lat: number; lng: number };
  radius_km?: number;
  bounds?: { north: number; south: number; east: number; west: number };
  layers?: string[];
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

export const geospatialApi = {
  query: (data: SpatialQuery) => api.post('/geospatial/query', data),
  getZones: (params?: Record<string, string>) => api.get<Zone[]>('/geospatial/zones', params),
  getContext: (lat: number, lng: number) =>
    api.post('/geospatial/context', { latitude: lat, longitude: lng }),
  getSupplyChains: () => api.get<SupplyChain[]>('/geospatial/supply-chains'),
  createSupplyChain: (data: { name: string; nodes: SupplyChainNode[] }) =>
    api.post<SupplyChain>('/geospatial/supply-chains', data),
};
