"use client";

import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/atoms";
import {
  KPICard,
  AlertItem,
  RiskGauge,
  RiskTrendChart,
  DonutChart,
} from "@/components/molecules";
import { useI18n } from "@/i18n";
import type { KPI, Alert } from "@/types";

export default function DashboardPage() {
  const { t } = useI18n();

  // Mock data for initial render
  const mockKPIs: KPI[] = [
    {
      id: "1",
      label: t("dashboard.globalRiskIndex"),
      value: 67,
      unit: t("common.points"),
      trend: "up",
      trendValue: 5.2,
      status: "high",
      description: t("dashboard.riskIndexDesc"),
    },
    {
      id: "2",
      label: t("dashboard.activeThreats"),
      value: 23,
      unit: t("common.signals"),
      trend: "up",
      trendValue: 12,
      status: "critical",
      description: t("dashboard.threatsDesc"),
    },
    {
      id: "3",
      label: t("dashboard.dataSources"),
      value: 847,
      unit: t("common.active"),
      trend: "stable",
      trendValue: 0.5,
      status: "low",
      description: t("dashboard.dataSourcesDesc"),
    },
    {
      id: "4",
      label: t("dashboard.assessmentsToday"),
      value: 156,
      unit: t("common.completed"),
      trend: "up",
      trendValue: 8.3,
      status: "medium",
      description: t("dashboard.assessmentsDesc"),
    },
  ];

  // Chart data
  const trendData = [
    { date: t("time.jan"), value: 45, geopolitical: 52, economic: 38 },
    { date: t("time.feb"), value: 52, geopolitical: 58, economic: 42 },
    { date: t("time.mar"), value: 48, geopolitical: 55, economic: 45 },
    { date: t("time.apr"), value: 61, geopolitical: 62, economic: 55 },
    { date: t("time.may"), value: 55, geopolitical: 60, economic: 48 },
    { date: t("time.jun"), value: 67, geopolitical: 72, economic: 58 },
    { date: t("time.jul"), value: 67, geopolitical: 75, economic: 62 },
  ];

  const riskDistribution = [
    { name: t("risk.critical"), value: 12, color: "#dc2626" },
    { name: t("risk.high"), value: 28, color: "#ef4444" },
    { name: t("risk.medium"), value: 35, color: "#f59e0b" },
    { name: t("risk.low"), value: 25, color: "#10b981" },
  ];

  const mockAlerts: Alert[] = [
    {
      id: "1",
      type: "critical",
      title: t("dashboard.alerts.criticalInfra"),
      message: t("dashboard.alerts.criticalInfraMsg"),
      source: t("dashboard.alerts.networkIntel"),
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      acknowledged: false,
    },
    {
      id: "2",
      type: "warning",
      title: t("dashboard.alerts.supplyChain"),
      message: t("dashboard.alerts.supplyChainMsg"),
      source: t("dashboard.alerts.economicAnalysis"),
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      acknowledged: false,
    },
    {
      id: "3",
      type: "info",
      title: t("dashboard.alerts.policyAnalysis"),
      message: t("dashboard.alerts.policyAnalysisMsg"),
      source: t("dashboard.alerts.policyEngine"),
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      acknowledged: true,
    },
  ];

  const recentActivity = [
    { id: "1", action: t("dashboard.activity.riskAssessed"), entity: "Acme Corp", time: "2m", icon: "assessment" },
    { id: "2", action: t("dashboard.activity.alertTriggered"), entity: "Supply Chain", time: "15m", icon: "alert" },
    { id: "3", action: t("dashboard.activity.reportGenerated"), entity: "Q4 Analysis", time: "1h", icon: "report" },
    { id: "4", action: t("dashboard.activity.entityAdded"), entity: "TechVentures Inc", time: "2h", icon: "entity" },
    { id: "5", action: t("dashboard.activity.scenarioRun"), entity: "Geopolitical Model", time: "3h", icon: "scenario" },
  ];

  const systemMetrics = [
    { label: t("dashboard.system.apiLatency"), value: "42ms", status: "good" },
    { label: t("dashboard.system.dataFreshness"), value: "< 5min", status: "good" },
    { label: t("dashboard.system.modelAccuracy"), value: "94.2%", status: "good" },
    { label: t("dashboard.system.queuedJobs"), value: "3", status: "warning" },
  ];

  return (
    <MainLayout
      title={t("nav.dashboard")}
      subtitle={t("dashboard.subtitle")}
    >
      <div className="space-y-6">
        {/* Top Stats Bar */}
        <div className="flex items-center justify-between bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <GlobeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">150+</p>
                <p className="text-xs text-gray-400">{t("dashboard.countriesMonitored")}</p>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-700" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <BuildingIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">10,847</p>
                <p className="text-xs text-gray-400">{t("dashboard.entitiesTracked")}</p>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-700" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <ShieldIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">99.9%</p>
                <p className="text-xs text-gray-400">{t("dashboard.systemUptime")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{t("dashboard.lastUpdated")}:</span>
            <span className="text-xs text-emerald-400">{t("time.justNow")}</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* KPI Grid */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockKPIs.map((kpi) => (
              <KPICard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </section>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("dashboard.riskTrendAnalysis")}</CardTitle>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-blue-500 rounded"></span>
                    {t("common.overall")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-red-500 rounded"></span>
                    {t("risk.geopolitical")}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RiskTrendChart
                data={trendData}
                dataKeys={[
                  { key: "value", color: "#3b82f6", name: t("common.overall") },
                  { key: "geopolitical", color: "#ef4444", name: t("risk.geopolitical") },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.riskDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={riskDistribution}
                centerLabel={t("common.total")}
                centerValue="847"
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Overview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("dashboard.riskByDimension")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center">
                  <RiskGauge score={67} size="lg" />
                  <p className="mt-2 text-sm text-gray-400">{t("dashboard.overallScore")}</p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <RiskDimensionBar
                    label={t("risk.geopolitical")}
                    value={72}
                    color="red"
                  />
                  <RiskDimensionBar
                    label={t("risk.economic")}
                    value={58}
                    color="amber"
                  />
                  <RiskDimensionBar
                    label={t("risk.technological")}
                    value={45}
                    color="amber"
                  />
                  <RiskDimensionBar
                    label={t("risk.infrastructure")}
                    value={81}
                    color="red"
                  />
                  <RiskDimensionBar
                    label={t("risk.climate")}
                    value={34}
                    color="emerald"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("dashboard.activeAlerts")}</CardTitle>
              <span className="text-xs text-gray-500">
                {mockAlerts.filter((a) => !a.acknowledged).length} {t("common.unread")}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => console.log("Acknowledge:", id)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Activity & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActivityIconBg(activity.icon)}`}>
                      {getActivityIcon(activity.icon)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{activity.action}</p>
                      <p className="text-xs text-gray-400">{activity.entity}</p>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time} {t("time.ago")}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.systemStatus")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemMetrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{metric.value}</span>
                      <div className={`w-2 h-2 rounded-full ${metric.status === 'good' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{t("dashboard.system.nextSync")}</span>
                  <span className="text-blue-400">2:45</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-blue-500 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Explainability Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.aiExplainability")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">{t("dashboard.explain.dataSources")}</h4>
                <p className="text-xs text-gray-400">
                  {t("dashboard.explain.dataSourcesDesc")}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">{t("dashboard.explain.methodology")}</h4>
                <p className="text-xs text-gray-400">
                  {t("dashboard.explain.methodologyDesc")}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">{t("dashboard.explain.limitations")}</h4>
                <p className="text-xs text-gray-400">
                  {t("dashboard.explain.limitationsDesc")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionCard
            icon={<AssessmentIcon />}
            label={t("dashboard.quickActions.newAssessment")}
            href="/risk"
          />
          <QuickActionCard
            icon={<SimulationIcon />}
            label={t("dashboard.quickActions.runSimulation")}
            href="/simulations"
          />
          <QuickActionCard
            icon={<ReportIcon />}
            label={t("dashboard.quickActions.generateReport")}
            href="/analytics"
          />
          <QuickActionCard
            icon={<AlertIcon />}
            label={t("dashboard.quickActions.configureAlerts")}
            href="/compliance"
          />
        </div>
      </div>
    </MainLayout>
  );
}

function RiskDimensionBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "red" | "amber" | "emerald";
}) {
  const colors = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-medium text-white">{value}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function QuickActionCard({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-800 hover:border-blue-500/50 transition-all group"
    >
      <div className="w-10 h-10 rounded-lg bg-gray-700 group-hover:bg-blue-500/20 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-all">
        {icon}
      </div>
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors text-center">{label}</span>
    </a>
  );
}

function getActivityIconBg(type: string) {
  switch (type) {
    case "assessment": return "bg-blue-500/20";
    case "alert": return "bg-red-500/20";
    case "report": return "bg-emerald-500/20";
    case "entity": return "bg-purple-500/20";
    case "scenario": return "bg-amber-500/20";
    default: return "bg-gray-500/20";
  }
}

function getActivityIcon(type: string) {
  const className = "w-4 h-4";
  switch (type) {
    case "assessment":
      return <svg className={`${className} text-blue-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case "alert":
      return <svg className={`${className} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
    case "report":
      return <svg className={`${className} text-emerald-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case "entity":
      return <svg className={`${className} text-purple-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
    case "scenario":
      return <svg className={`${className} text-amber-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    default:
      return <svg className={`${className} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  }
}

// Icons
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function AssessmentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SimulationIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
