// ATLAS Store - Zustand State Management
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  Alert,
  RiskLevel,
  MapViewState,
  ServiceStatus,
} from "@/types";

// ============================================
// AUTH STORE
// ============================================
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: "atlas-auth" }
  )
);

// ============================================
// UI STORE
// ============================================
interface UIState {
  sidebarOpen: boolean;
  theme: "dark" | "light";
  notifications: Alert[];
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;
  addNotification: (alert: Alert) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: "dark",
  notifications: [],
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  addNotification: (alert) =>
    set((state) => ({ notifications: [alert, ...state.notifications] })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

// ============================================
// DASHBOARD STORE
// ============================================
interface DashboardState {
  selectedTimeRange: "24h" | "7d" | "30d" | "90d";
  selectedRiskLevels: RiskLevel[];
  refreshInterval: number;
  setTimeRange: (range: "24h" | "7d" | "30d" | "90d") => void;
  setRiskLevels: (levels: RiskLevel[]) => void;
  setRefreshInterval: (interval: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedTimeRange: "7d",
  selectedRiskLevels: ["low", "medium", "high", "critical"],
  refreshInterval: 30000,
  setTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
  setRiskLevels: (selectedRiskLevels) => set({ selectedRiskLevels }),
  setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
}));

// ============================================
// MAP STORE
// ============================================
interface MapState {
  viewState: MapViewState;
  visibleLayers: string[];
  selectedFeatureId: string | null;
  setViewState: (viewState: MapViewState) => void;
  toggleLayer: (layerId: string) => void;
  setSelectedFeature: (featureId: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewState: {
    longitude: -51.9,
    latitude: -14.7,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  },
  visibleLayers: ["infrastructure", "risk-zones"],
  selectedFeatureId: null,
  setViewState: (viewState) => set({ viewState }),
  toggleLayer: (layerId) =>
    set((state) => ({
      visibleLayers: state.visibleLayers.includes(layerId)
        ? state.visibleLayers.filter((id) => id !== layerId)
        : [...state.visibleLayers, layerId],
    })),
  setSelectedFeature: (selectedFeatureId) => set({ selectedFeatureId }),
}));

// ============================================
// PLATFORM STORE
// ============================================
interface PlatformState {
  status: ServiceStatus;
  lastHealthCheck: string | null;
  setStatus: (status: ServiceStatus) => void;
  setLastHealthCheck: (timestamp: string) => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  status: "operational",
  lastHealthCheck: null,
  setStatus: (status) => set({ status }),
  setLastHealthCheck: (lastHealthCheck) => set({ lastHealthCheck }),
}));
