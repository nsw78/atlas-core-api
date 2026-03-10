import { create } from 'zustand';

interface ThreatEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

interface ThreatState {
  threats: ThreatEvent[];
  filter: {
    severity: string | null;
    type: string | null;
    acknowledged: boolean | null;
  };
  isLoading: boolean;

  setThreats: (threats: ThreatEvent[]) => void;
  addThreat: (threat: ThreatEvent) => void;
  acknowledgeThreat: (id: string) => void;
  setFilter: (filter: Partial<ThreatState['filter']>) => void;
  setLoading: (loading: boolean) => void;
  filteredThreats: () => ThreatEvent[];
}

export const useThreatStore = create<ThreatState>((set, get) => ({
  threats: [],
  filter: { severity: null, type: null, acknowledged: null },
  isLoading: false,

  setThreats: (threats) => set({ threats }),
  addThreat: (threat) => set((s) => ({ threats: [threat, ...s.threats] })),
  acknowledgeThreat: (id) =>
    set((s) => ({
      threats: s.threats.map((t) => (t.id === id ? { ...t, acknowledged: true } : t)),
    })),
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  setLoading: (isLoading) => set({ isLoading }),
  filteredThreats: () => {
    const { threats, filter } = get();
    return threats.filter((t) => {
      if (filter.severity && t.severity !== filter.severity) return false;
      if (filter.type && t.type !== filter.type) return false;
      if (filter.acknowledged !== null && t.acknowledged !== filter.acknowledged) return false;
      return true;
    });
  },
}));
