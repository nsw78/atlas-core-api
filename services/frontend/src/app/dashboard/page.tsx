"use client";

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layouts";
import { useAlerts } from "@/hooks/useAlerts";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useI18n } from "@/i18n";
import { generateTimeSeries, analyticsKPIs } from "@/data/analytics";
import {
  severityConfig,
  alertCategories,
  type AlertDetail,
  type AlertSeverity,
  type AlertCategory,
} from "@/data/alerts";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ============================================
// ALERT MODAL
// ============================================
function AlertModal({
  alert,
  isOpen,
  onClose,
  onAcknowledge,
  onInvestigate,
  onDismiss,
}: {
  alert: AlertDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onInvestigate: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const { t } = useI18n();
  if (!isOpen || !alert) return null;

  const sev = severityConfig[alert.severity];
  const category = alertCategories.find((c) => c.value === alert.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className={`p-6 border-b border-gray-700 ${sev.bg}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sev.bg} ${sev.color} border ${sev.border}`}>
                  {sev.label}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                  {category?.label || alert.category}
                </span>
                <span className="text-xs text-gray-400">{alert.id}</span>
              </div>
              <h2 className="text-lg font-semibold text-white">{alert.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">{t("dashboard.alertModal.description")}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{alert.description}</p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetadataItem label={t("dashboard.alertModal.source")} value={alert.source} />
            <MetadataItem label={t("dashboard.alertModal.region")} value={alert.region} />
            <MetadataItem label={t("dashboard.alertModal.country")} value={alert.country || "N/A"} />
            <MetadataItem label={t("dashboard.alertModal.impactScore")} value={`${alert.estimatedImpactScore}/100`} highlight />
            <MetadataItem label={t("dashboard.alertModal.status")} value={alert.status.charAt(0).toUpperCase() + alert.status.slice(1)} />
            <MetadataItem label={t("dashboard.alertModal.reported")} value={getTimeAgo(alert.timestamp)} />
            <MetadataItem label={t("dashboard.alertModal.lastUpdate")} value={getTimeAgo(alert.updatedAt)} />
            <MetadataItem label={t("dashboard.alertModal.entities")} value={`${alert.relatedEntities.length} ${t("dashboard.alertModal.linked")}`} />
          </div>

          {/* Impact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Impact Assessment</h3>
            <p className="text-sm text-gray-400">{alert.impact}</p>
            <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${alert.estimatedImpactScore >= 80 ? "bg-red-500" : alert.estimatedImpactScore >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${alert.estimatedImpactScore}%` }}
              />
            </div>
          </div>

          {/* Related Entities */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Related Entities</h3>
            <div className="flex flex-wrap gap-2">
              {alert.relatedEntities.map((entity) => (
                <span key={entity} className="px-3 py-1 bg-gray-800 border border-gray-600 rounded-lg text-xs text-gray-300">
                  {entity}
                </span>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Recommendations</h3>
            <ul className="space-y-2">
              {alert.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* External Links */}
          {alert.externalLinks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">External References</h3>
              <div className="flex flex-wrap gap-3">
                {alert.externalLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={() => { onDismiss(alert.id); onClose(); }}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t("dashboard.alertModal.dismiss")}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onAcknowledge(alert.id); onClose(); }}
              className="px-4 py-2 text-sm bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              {t("dashboard.alertModal.acknowledge")}
            </button>
            <button
              onClick={() => { onInvestigate(alert.id); onClose(); }}
              className="px-4 py-2 text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              {t("dashboard.alertModal.investigate")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetadataItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-amber-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
export default function DashboardPage() {
  const { t } = useI18n();
  const {
    alerts,
    selectedAlert,
    isModalOpen,
    unreadCount,
    criticalCount,
    filterSeverity,
    filterCategory,
    setFilterSeverity,
    setFilterCategory,
    openAlert,
    closeModal,
    acknowledgeAlert,
    investigateAlert,
    dismissAlert,
    refresh,
  } = useAlerts();

  const autoRefresh = useAutoRefresh({
    defaultInterval: 30,
    onRefresh: refresh,
    enabled: true,
  });

  const [chartRange] = useState(30);
  const trendData = useMemo(() => generateTimeSeries(chartRange), [chartRange]);

  // KPI data for the top strip
  const kpis = [
    { label: "Risk Index", value: "67", trend: "+5.2%", color: "text-red-400", icon: ShieldIcon },
    { label: "Active Threats", value: "23", trend: "+12%", color: "text-amber-400", icon: AlertTriangleIcon },
    { label: "Unread Alerts", value: String(unreadCount), trend: "", color: "text-blue-400", icon: InboxIcon },
    { label: "Critical", value: String(criticalCount), trend: "", color: "text-red-500", icon: FireIcon },
    { label: "Data Sources", value: "847", trend: "+1.8%", color: "text-emerald-400", icon: DatabaseIcon },
    { label: "Model Accuracy", value: "94.2%", trend: "+1.2%", color: "text-cyan-400", icon: CpuIcon },
  ];

  return (
    <MainLayout title="Command Center" subtitle="Real-time threat monitoring and alert management">
      {/* Alert Modal */}
      <AlertModal
        alert={selectedAlert}
        isOpen={isModalOpen}
        onClose={closeModal}
        onAcknowledge={acknowledgeAlert}
        onInvestigate={investigateAlert}
        onDismiss={dismissAlert}
      />

      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-gray-400">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              {kpi.trend && (
                <span className={`text-xs ${kpi.trend.startsWith("+") ? "text-red-400" : "text-emerald-400"}`}>
                  {kpi.trend} vs last period
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main Content: Chart + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Trend Chart */}
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Incident Trend (30 days)</h2>
                <p className="text-xs text-gray-400">Across all threat categories</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Auto-refresh controls */}
                <button
                  onClick={autoRefresh.toggleActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    autoRefresh.isActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-gray-700 text-gray-400 border border-gray-600"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh.isActive ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}`} />
                  {autoRefresh.isActive ? `${autoRefresh.countdown}s` : "Paused"}
                </button>
                <button
                  onClick={autoRefresh.manualRefresh}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  title="Refresh now"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCyber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    fontSize={10}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis stroke="#6b7280" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#gradTotal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="cyber" stroke="#8b5cf6" fill="url(#gradCyber)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded" /> Total Incidents</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-500 rounded" /> Cyber Threats</span>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
            <div className="space-y-4">
              {analyticsKPIs.slice(0, 6).map((kpi) => (
                <div key={kpi.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{kpi.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {kpi.value}{kpi.unit}
                    </span>
                    <span className={`text-xs ${kpi.trendPercent > 0 ? (kpi.id === "active-incidents" || kpi.id === "avg-severity" || kpi.id === "affected-regions" ? "text-red-400" : "text-emerald-400") : "text-emerald-400"}`}>
                      {kpi.trendPercent > 0 ? "+" : ""}{kpi.trendPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Last refresh</span>
                <span className="text-emerald-400">{autoRefresh.lastRefresh.toLocaleTimeString()}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-400">All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Alerts Section */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Active Alerts</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full">
                  {unreadCount} unread
                </span>
              )}
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 bg-red-600/30 text-red-300 text-xs font-semibold rounded-full animate-pulse">
                  {criticalCount} critical
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | "all")}
                className="bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as AlertCategory | "all")}
                className="bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {alertCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Alert List */}
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400 text-sm">No alerts matching current filters</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const sev = severityConfig[alert.severity];
                const cat = alertCategories.find((c) => c.value === alert.category);
                return (
                  <button
                    key={alert.id}
                    onClick={() => openAlert(alert)}
                    className={`w-full text-left p-4 rounded-xl border transition-all hover:bg-gray-800/50 ${
                      alert.status === "unread"
                        ? "bg-gray-800/30 border-gray-600"
                        : "bg-transparent border-gray-800"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Severity indicator */}
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                        alert.severity === "critical" ? "bg-red-500 animate-pulse" :
                        alert.severity === "high" ? "bg-orange-500" :
                        alert.severity === "medium" ? "bg-amber-500" : "bg-emerald-500"
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sev.bg} ${sev.color}`}>
                            {sev.label}
                          </span>
                          <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-800 rounded">
                            {cat?.label}
                          </span>
                          {alert.status === "unread" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          )}
                        </div>
                        <p className="text-sm text-white truncate font-medium">{alert.title}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-gray-500">{alert.source}</span>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="text-xs text-gray-500">{alert.region}</span>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="text-xs text-gray-500">{getTimeAgo(alert.timestamp)}</span>
                        </div>
                      </div>

                      {/* Impact score */}
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-bold ${
                          alert.estimatedImpactScore >= 80 ? "text-red-400" :
                          alert.estimatedImpactScore >= 60 ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {alert.estimatedImpactScore}
                        </div>
                        <span className="text-[10px] text-gray-500">impact</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// ============================================
// HELPERS
// ============================================
function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================
// ICONS
// ============================================
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function FireIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}
