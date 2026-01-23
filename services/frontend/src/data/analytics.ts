// ATLAS - Enterprise Analytics Data (mirrors real-world intelligence metrics)

export interface AnalyticsKPI {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}

export interface IncidentTimeSeries {
  date: string;
  cyber: number;
  infrastructure: number;
  energy: number;
  geopolitical: number;
  climate: number;
  total: number;
}

export interface RegionHeatmapData {
  region: string;
  code: string;
  incidents: number;
  severity: number;
  trend: "up" | "down" | "stable";
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  color: string;
  avgSeverity: number;
}

// Generate realistic time series data (last 30 days)
export function generateTimeSeries(days: number = 30): IncidentTimeSeries[] {
  const data: IncidentTimeSeries[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;
    const trendFactor = 1 + (i / days) * 0.15; // slight upward trend

    const cyber = Math.round((8 + Math.random() * 12) * weekendFactor * trendFactor);
    const infrastructure = Math.round((3 + Math.random() * 7) * weekendFactor);
    const energy = Math.round((4 + Math.random() * 8) * trendFactor);
    const geopolitical = Math.round((5 + Math.random() * 10) * trendFactor);
    const climate = Math.round((2 + Math.random() * 6) * (1 + Math.sin(i / 7) * 0.3));

    data.push({
      date: date.toISOString().split("T")[0] as string,
      cyber,
      infrastructure,
      energy,
      geopolitical,
      climate,
      total: cyber + infrastructure + energy + geopolitical + climate,
    });
  }
  return data;
}

export const analyticsKPIs: AnalyticsKPI[] = [
  { id: "active-incidents", label: "Active Incidents", value: 142, previousValue: 156, unit: "", trend: "down", trendPercent: -8.9 },
  { id: "affected-regions", label: "Affected Regions", value: 23, previousValue: 19, unit: "", trend: "up", trendPercent: 21.0 },
  { id: "avg-severity", label: "Avg Severity", value: 6.8, previousValue: 6.2, unit: "/10", trend: "up", trendPercent: 9.7 },
  { id: "resolution-time", label: "Avg Resolution", value: 4.2, previousValue: 5.1, unit: "hrs", trend: "down", trendPercent: -17.6 },
  { id: "model-accuracy", label: "Model Accuracy", value: 94.2, previousValue: 93.1, unit: "%", trend: "up", trendPercent: 1.2 },
  { id: "data-sources", label: "Active Sources", value: 847, previousValue: 832, unit: "", trend: "up", trendPercent: 1.8 },
];

export const regionHeatmap: RegionHeatmapData[] = [
  { region: "North America", code: "NA", incidents: 67, severity: 45, trend: "stable" },
  { region: "Europe", code: "EU", incidents: 89, severity: 58, trend: "up" },
  { region: "Asia Pacific", code: "APAC", incidents: 156, severity: 72, trend: "up" },
  { region: "Middle East", code: "ME", incidents: 198, severity: 81, trend: "up" },
  { region: "South America", code: "SA", incidents: 45, severity: 38, trend: "down" },
  { region: "Africa", code: "AF", incidents: 112, severity: 64, trend: "stable" },
  { region: "Oceania", code: "OC", incidents: 28, severity: 32, trend: "down" },
];

export const categoryBreakdown: CategoryBreakdown[] = [
  { category: "Cyber Security", count: 312, percentage: 28, color: "#8b5cf6", avgSeverity: 7.2 },
  { category: "Geopolitical", count: 267, percentage: 24, color: "#ef4444", avgSeverity: 7.8 },
  { category: "Energy", count: 198, percentage: 18, color: "#f59e0b", avgSeverity: 6.5 },
  { category: "Infrastructure", count: 156, percentage: 14, color: "#3b82f6", avgSeverity: 5.9 },
  { category: "Climate", count: 112, percentage: 10, color: "#06b6d4", avgSeverity: 6.1 },
  { category: "Supply Chain", count: 67, percentage: 6, color: "#10b981", avgSeverity: 5.4 },
];

export type TimeRange = "7d" | "30d" | "90d" | "1y";
export type ThreatType = "all" | "cyber" | "infrastructure" | "energy" | "geopolitical" | "climate" | "supply_chain";
export type RegionFilter = "all" | "NA" | "EU" | "APAC" | "ME" | "SA" | "AF" | "OC";
