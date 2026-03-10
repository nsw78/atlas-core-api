import { create } from 'zustand';

interface SimulationRun {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  parameters: Record<string, unknown>;
  results: Record<string, number> | null;
  createdAt: string;
}

interface SimulationState {
  runs: SimulationRun[];
  activeRunId: string | null;
  isRunning: boolean;

  addRun: (run: SimulationRun) => void;
  updateRun: (id: string, update: Partial<SimulationRun>) => void;
  setActiveRun: (id: string | null) => void;
  setRunning: (running: boolean) => void;
  getActiveRun: () => SimulationRun | undefined;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  runs: [],
  activeRunId: null,
  isRunning: false,

  addRun: (run) => set((s) => ({ runs: [run, ...s.runs] })),
  updateRun: (id, update) =>
    set((s) => ({
      runs: s.runs.map((r) => (r.id === id ? { ...r, ...update } : r)),
    })),
  setActiveRun: (id) => set({ activeRunId: id }),
  setRunning: (isRunning) => set({ isRunning }),
  getActiveRun: () => {
    const { runs, activeRunId } = get();
    return runs.find((r) => r.id === activeRunId);
  },
}));
