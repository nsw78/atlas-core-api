import { create } from 'zustand';

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  type: 'infrastructure' | 'energy' | 'supply-chain' | 'maritime' | 'risk-zones' | 'satellites';
}

interface GeoState {
  viewport: {
    lat: number;
    lng: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  layers: MapLayer[];
  selectedFeatureId: string | null;
  mapMode: '2d' | '3d' | 'satellite';

  setViewport: (viewport: Partial<GeoState['viewport']>) => void;
  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setSelectedFeature: (id: string | null) => void;
  setMapMode: (mode: GeoState['mapMode']) => void;
}

const defaultLayers: MapLayer[] = [
  { id: 'infrastructure', name: 'Infrastructure', visible: true, opacity: 1, type: 'infrastructure' },
  { id: 'energy', name: 'Energy', visible: false, opacity: 0.8, type: 'energy' },
  { id: 'supply-chain', name: 'Supply Chain', visible: false, opacity: 0.8, type: 'supply-chain' },
  { id: 'maritime', name: 'Maritime', visible: false, opacity: 0.7, type: 'maritime' },
  { id: 'risk-zones', name: 'Risk Zones', visible: true, opacity: 0.6, type: 'risk-zones' },
  { id: 'satellites', name: 'Satellites', visible: false, opacity: 0.5, type: 'satellites' },
];

export const useGeoStore = create<GeoState>((set) => ({
  viewport: { lat: 0, lng: 0, zoom: 2, pitch: 0, bearing: 0 },
  layers: defaultLayers,
  selectedFeatureId: null,
  mapMode: '2d',

  setViewport: (viewport) => set((s) => ({ viewport: { ...s.viewport, ...viewport } })),
  toggleLayer: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    })),
  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
    })),
  setSelectedFeature: (id) => set({ selectedFeatureId: id }),
  setMapMode: (mapMode) => set({ mapMode }),
}));
