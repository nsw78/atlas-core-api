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
import type { KPI, Alert } from "@/types";

// Mock data for initial render
const mockKPIs: KPI[] = [
  {
    id: "1",
    label: "Global Risk Index",
    value: 67,
    unit: "pts",
    trend: "up",
    trendValue: 5.2,
    status: "high",
    description: "Composite risk score across all monitored regions",
  },
  {
    id: "2",
    label: "Active Threats",
    value: 23,
    unit: "signals",
    trend: "up",
    trendValue: 12,
    status: "critical",
    description: "High-priority threats requiring immediate attention",
  },
  {
    id: "3",
    label: "Data Sources",
    value: 847,
    unit: "active",
    trend: "stable",
    trendValue: 0.5,
    status: "low",
    description: "OSINT sources currently being monitored",
  },
  {
    id: "4",
    label: "Assessments Today",
    value: 156,
    unit: "completed",
    trend: "up",
    trendValue: 8.3,
    status: "medium",
    description: "Risk assessments generated in the last 24 hours",
  },
];

// Chart data
const trendData = [
  { date: "Jan", value: 45, geopolitical: 52, economic: 38 },
  { date: "Feb", value: 52, geopolitical: 58, economic: 42 },
  { date: "Mar", value: 48, geopolitical: 55, economic: 45 },
  { date: "Apr", value: 61, geopolitical: 62, economic: 55 },
  { date: "May", value: 55, geopolitical: 60, economic: 48 },
  { date: "Jun", value: 67, geopolitical: 72, economic: 58 },
  { date: "Jul", value: 67, geopolitical: 75, economic: 62 },
];

const riskDistribution = [
  { name: "Critical", value: 12, color: "#dc2626" },
  { name: "High", value: 28, color: "#ef4444" },
  { name: "Medium", value: 35, color: "#f59e0b" },
  { name: "Low", value: 25, color: "#10b981" },
];

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "critical",
    title: "Critical Infrastructure Alert",
    message:
      "Unusual network activity detected in energy sector infrastructure across Northern Europe",
    source: "Network Intelligence",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    acknowledged: false,
  },
  {
    id: "2",
    type: "warning",
    title: "Supply Chain Disruption",
    message:
      "Potential disruption in semiconductor supply chain due to regulatory changes in Taiwan Strait",
    source: "Economic Analysis",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    acknowledged: false,
  },
  {
    id: "3",
    type: "info",
    title: "New Policy Analysis Available",
    message:
      "Updated impact assessment for recent EU Digital Markets Act amendments",
    source: "Policy Engine",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    acknowledged: true,
  },
];

export default function DashboardPage() {
  return (
    <MainLayout
      title="Executive Dashboard"
      subtitle="Real-time strategic intelligence overview"
    >
      <div className="space-y-6">
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
                <CardTitle>Risk Trend Analysis</CardTitle>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-blue-500 rounded"></span>
                    Overall
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-red-500 rounded"></span>
                    Geopolitical
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RiskTrendChart
                data={trendData}
                dataKeys={[
                  { key: "value", color: "#3b82f6", name: "Overall" },
                  { key: "geopolitical", color: "#ef4444", name: "Geopolitical" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={riskDistribution}
                centerLabel="Total"
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
              <CardTitle>Risk by Dimension</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center">
                  <RiskGauge score={67} size="lg" />
                  <p className="mt-2 text-sm text-gray-400">Overall Score</p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <RiskDimensionBar
                    label="Geopolitical"
                    value={72}
                    color="red"
                  />
                  <RiskDimensionBar
                    label="Economic"
                    value={58}
                    color="amber"
                  />
                  <RiskDimensionBar
                    label="Technological"
                    value={45}
                    color="amber"
                  />
                  <RiskDimensionBar
                    label="Infrastructure"
                    value={81}
                    color="red"
                  />
                  <RiskDimensionBar
                    label="Climate"
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
              <CardTitle>Active Alerts</CardTitle>
              <span className="text-xs text-gray-500">
                {mockAlerts.filter((a) => !a.acknowledged).length} unread
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

        {/* Explainability Section */}
        <Card>
          <CardHeader>
            <CardTitle>AI Explainability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">Data Sources</h4>
                <p className="text-xs text-gray-400">
                  Analysis based on 847 verified OSINT sources including Reuters,
                  Bloomberg, official government publications, and specialized
                  intelligence feeds.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">Methodology</h4>
                <p className="text-xs text-gray-400">
                  Risk scores calculated using ensemble ML models with 94.2%
                  historical accuracy. All predictions include confidence
                  intervals and factor decomposition.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white">Limitations</h4>
                <p className="text-xs text-gray-400">
                  Model does not account for black swan events. Predictions are
                  based on historical patterns and may not reflect unprecedented
                  scenarios.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
