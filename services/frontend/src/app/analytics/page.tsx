"use client";

import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layouts";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useI18n } from "@/contexts/I18nContext";
import {
  generateTimeSeries,
  analyticsKPIs,
  regionHeatmap,
  categoryBreakdown,
  type TimeRange,
  type ThreatType,
  type RegionFilter,
} from "@/data/analytics";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

// ============================================
// EXPORT UTILITY
// ============================================
function exportData(data: unknown[], format: "csv" | "json", filename: string) {
  let content: string;
  let mimeType: string;

  if (format === "json") {
    content = JSON.stringify(data, null, 2);
    mimeType = "application/json";
  } else {
    if (data.length === 0) return;
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((item) =>
      headers.map((h) => String((item as Record<string, unknown>)[h] ?? "")).join(",")
    );
    content = [headers.join(","), ...rows].join("\n");
    mimeType = "text/csv";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================
// ANALYTICS PAGE
// ============================================
export default function AnalyticsPage() {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [threatType, setThreatType] = useState<ThreatType>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "breakdown">("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const autoRefresh = useAutoRefresh({
    defaultInterval: 60,
    onRefresh: refresh,
    enabled: false,
  });

  // Generate time series data based on selected range
  const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
  const timeSeries = useMemo(() => generateTimeSeries(days), [days, refreshKey]);

  // Filtered time series
  const filteredTimeSeries = useMemo(() => {
    if (threatType === "all") return timeSeries;
    return timeSeries.map((d) => ({
      ...d,
      total: (d as unknown as Record<string, number>)[threatType] || d.total,
    }));
  }, [timeSeries, threatType]);

  // Filtered regions
  const filteredRegions = useMemo(() => {
    if (regionFilter === "all") return regionHeatmap;
    return regionHeatmap.filter((r) => r.code === regionFilter);
  }, [regionFilter]);

  // Radar data for category comparison
  const radarData = useMemo(
    () =>
      categoryBreakdown.map((c) => ({
        category: c.category.split(" ")[0] || c.category,
        incidents: c.count,
        severity: c.avgSeverity * 10,
        percentage: c.percentage,
      })),
    []
  );

  const handleExport = (format: "csv" | "json") => {
    const exportPayload = timeSeries.map((d) => ({
      date: d.date,
      total: d.total,
      cyber: d.cyber,
      infrastructure: d.infrastructure,
      energy: d.energy,
      geopolitical: d.geopolitical,
      climate: d.climate,
    }));
    exportData(exportPayload, format, `atlas-analytics-${timeRange}`);
  };

  return (
    <MainLayout title={t("analytics.title")} subtitle={t("analytics.subtitle")}>
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
            {(["overview", "trends", "breakdown"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                {t(`analytics.${tab}`)}
              </button>
            ))}
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <select
              value={threatType}
              onChange={(e) => setThreatType(e.target.value as ThreatType)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">{t("common.all")} Threats</option>
              <option value="cyber">Cyber</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="energy">Energy</option>
              <option value="geopolitical">Geopolitical</option>
              <option value="climate">Climate</option>
              <option value="supply_chain">Supply Chain</option>
            </select>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as RegionFilter)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">{t("common.all")} Regions</option>
              <option value="NA">North America</option>
              <option value="EU">Europe</option>
              <option value="APAC">Asia Pacific</option>
              <option value="ME">Middle East</option>
              <option value="SA">South America</option>
              <option value="AF">Africa</option>
              <option value="OC">Oceania</option>
            </select>

            {/* Export dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors">
                <DownloadIcon className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 top-full mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-t-lg"
                >
                  {t("common.export")} CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-b-lg"
                >
                  {t("common.export")} JSON
                </button>
              </div>
            </div>

            {/* Auto-refresh */}
            <button
              onClick={autoRefresh.toggleActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                autoRefresh.isActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh.isActive ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
              {autoRefresh.isActive ? `Auto ${autoRefresh.countdown}s` : "Auto-refresh"}
            </button>

            <button
              onClick={autoRefresh.manualRefresh}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
              title="Refresh now"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {analyticsKPIs.map((kpi) => (
            <div key={kpi.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
              <p className="text-xs text-gray-400 mb-1">{kpi.label}</p>
              <p className="text-xl font-bold text-white">
                {kpi.value}{kpi.unit}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {kpi.trendPercent > 0 ? (
                  <TrendUpIcon className="w-3 h-3 text-red-400" />
                ) : (
                  <TrendDownIcon className="w-3 h-3 text-emerald-400" />
                )}
                <span className={`text-xs ${
                  kpi.id === "resolution-time" || kpi.id === "active-incidents"
                    ? (kpi.trendPercent < 0 ? "text-emerald-400" : "text-red-400")
                    : (kpi.trendPercent > 0 ? "text-emerald-400" : "text-red-400")
                }`}>
                  {kpi.trendPercent > 0 ? "+" : ""}{kpi.trendPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Based on Active Tab */}
        {activeTab === "overview" && (
          <>
            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Incident Trend */}
              <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Incident Trend</h2>
                    <p className="text-xs text-gray-400">{days}-day view across categories</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredTimeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aGradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="aGradCyber" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="aGradGeo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                        labelStyle={{ color: "#9ca3af" }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#aGradTotal)" strokeWidth={2} name="Total" />
                      {threatType === "all" && (
                        <>
                          <Area type="monotone" dataKey="cyber" stroke="#8b5cf6" fill="url(#aGradCyber)" strokeWidth={1.5} name="Cyber" />
                          <Area type="monotone" dataKey="geopolitical" stroke="#ef4444" fill="url(#aGradGeo)" strokeWidth={1.5} name="Geopolitical" />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded" /> Total</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500 rounded" /> Cyber</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 rounded" /> Geopolitical</span>
                </div>
              </div>

              {/* Category Breakdown Pie */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-1">{t("analytics.breakdown")}</h2>
                <p className="text-xs text-gray-400 mb-4">{t("analytics.byThreatType")}</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="category"
                      >
                        {categoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-gray-400">{cat.category}</span>
                      </div>
                      <span className="text-xs font-medium text-white">{cat.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Region Bar Chart */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-1">{t("analytics.regionalIncidents")}</h2>
                <p className="text-xs text-gray-400 mb-4">{t("analytics.incidentsByRegion")}</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredRegions} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#6b7280" fontSize={10} />
                      <YAxis type="category" dataKey="region" stroke="#6b7280" fontSize={10} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      />
                      <Bar dataKey="incidents" name="Incidents" radius={[0, 4, 4, 0]}>
                        {filteredRegions.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.severity >= 70 ? "#ef4444" : entry.severity >= 50 ? "#f59e0b" : "#10b981"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-1">Threat Profile</h2>
                <p className="text-xs text-gray-400 mb-4">Multi-dimensional threat analysis</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="category" stroke="#9ca3af" fontSize={10} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#4b5563" fontSize={9} />
                      <Radar name="Incidents" dataKey="severity" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Radar name="Share %" dataKey="percentage" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "trends" && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Detailed Trend Analysis</h2>
                <p className="text-xs text-gray-400">All threat categories over {days} days</p>
              </div>
            </div>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis stroke="#6b7280" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="cyber" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} name="Cyber" />
                  <Area type="monotone" dataKey="infrastructure" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} name="Infrastructure" />
                  <Area type="monotone" dataKey="energy" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} name="Energy" />
                  <Area type="monotone" dataKey="geopolitical" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} name="Geopolitical" />
                  <Area type="monotone" dataKey="climate" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeWidth={2} name="Climate" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "breakdown" && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">{t("analytics.riskByRegion")}</h2>
              <p className="text-xs text-gray-400">Comprehensive analysis by region</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Region</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Incidents</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trend</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {regionHeatmap.map((region) => (
                    <tr key={region.code} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-white">{region.region}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-300">{region.incidents}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-700 rounded-full">
                            <div
                              className={`h-full rounded-full ${
                                region.severity >= 70 ? "bg-red-500" :
                                region.severity >= 50 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${region.severity}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{region.severity}/100</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1 text-xs ${
                          region.trend === "up" ? "text-red-400" :
                          region.trend === "down" ? "text-emerald-400" : "text-gray-400"
                        }`}>
                          {region.trend === "up" ? <TrendUpIcon className="w-3 h-3" /> :
                           region.trend === "down" ? <TrendDownIcon className="w-3 h-3" /> :
                           <span className="w-3 h-0.5 bg-gray-500 rounded" />}
                          {region.trend}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          region.severity >= 70 ? "bg-red-500/20 text-red-400" :
                          region.severity >= 50 ? "bg-amber-500/20 text-amber-400" :
                          "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {region.severity >= 70 ? "High Alert" : region.severity >= 50 ? "Monitoring" : "Stable"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// ============================================
// ICONS
// ============================================
function TrendUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function TrendDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
