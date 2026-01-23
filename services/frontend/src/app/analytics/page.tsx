"use client";

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/atoms";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// Types
interface TimeSeriesData {
  date: string;
  operational: number;
  financial: number;
  geopolitical: number;
  reputational: number;
  compliance: number;
}

interface SectorRisk {
  sector: string;
  risk: number;
  trend: "up" | "down" | "stable";
  alerts: number;
}

interface RegionData {
  region: string;
  riskScore: number;
  incidents: number;
  assets: number;
  coverage: number;
}

// Mock data generators
const generateTimeSeriesData = (): TimeSeriesData[] => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((month) => ({
    date: month,
    operational: Math.floor(Math.random() * 40) + 30,
    financial: Math.floor(Math.random() * 35) + 25,
    geopolitical: Math.floor(Math.random() * 50) + 40,
    reputational: Math.floor(Math.random() * 30) + 20,
    compliance: Math.floor(Math.random() * 25) + 15,
  }));
};

const sectorRiskData: SectorRisk[] = [
  { sector: "Energy & Utilities", risk: 78, trend: "up", alerts: 23 },
  { sector: "Financial Services", risk: 65, trend: "stable", alerts: 18 },
  { sector: "Technology", risk: 52, trend: "down", alerts: 12 },
  { sector: "Healthcare", risk: 34, trend: "stable", alerts: 7 },
  { sector: "Infrastructure", risk: 81, trend: "up", alerts: 28 },
  { sector: "Manufacturing", risk: 59, trend: "down", alerts: 14 },
];

const regionData: RegionData[] = [
  { region: "Asia Pacific", riskScore: 72, incidents: 156, assets: 2340, coverage: 94 },
  { region: "Europe", riskScore: 58, incidents: 89, assets: 1890, coverage: 97 },
  { region: "North America", riskScore: 45, incidents: 67, assets: 3120, coverage: 99 },
  { region: "Middle East", riskScore: 81, incidents: 198, assets: 890, coverage: 88 },
  { region: "South America", riskScore: 38, incidents: 45, assets: 670, coverage: 82 },
  { region: "Africa", riskScore: 64, incidents: 112, assets: 420, coverage: 76 },
];

const riskDistributionData = [
  { name: "Critical", value: 12, color: "#ef4444" },
  { name: "High", value: 28, color: "#f97316" },
  { name: "Medium", value: 35, color: "#eab308" },
  { name: "Low", value: 25, color: "#22c55e" },
];

const radarData = [
  { dimension: "Operational", score: 72, benchmark: 65 },
  { dimension: "Financial", score: 58, benchmark: 60 },
  { dimension: "Geopolitical", score: 85, benchmark: 70 },
  { dimension: "Reputational", score: 45, benchmark: 50 },
  { dimension: "Compliance", score: 62, benchmark: 75 },
  { dimension: "Cyber", score: 78, benchmark: 68 },
];

// KPI Card Component
function KPICard({
  title,
  value,
  change,
  changeType,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="p-3 bg-gray-800/50 rounded-xl">{icon}</div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center text-sm font-medium ${
              changeType === "positive"
                ? "text-emerald-400"
                : changeType === "negative"
                  ? "text-red-400"
                  : "text-gray-400"
            }`}
          >
            {changeType === "positive" ? (
              <TrendUpIcon className="w-4 h-4 mr-1" />
            ) : changeType === "negative" ? (
              <TrendDownIcon className="w-4 h-4 mr-1" />
            ) : (
              <TrendNeutralIcon className="w-4 h-4 mr-1" />
            )}
            {change}
          </span>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Custom Tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl backdrop-blur-sm">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-400">{entry.name}:</span>
            <span className="text-white font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "breakdown">("overview");

  const timeSeriesData = useMemo(() => generateTimeSeriesData(), []);

  return (
    <MainLayout
      title="Analytics Dashboard"
      subtitle="Enterprise risk intelligence and strategic insights"
    >
      <div className="space-y-6">
        {/* Header with Filters */}
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
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Regions</option>
              <option value="apac">Asia Pacific</option>
              <option value="emea">Europe & Middle East</option>
              <option value="americas">Americas</option>
            </select>
            <select
              value={selectedRiskLevel}
              onChange={(e) => setSelectedRiskLevel(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Button variant="secondary" size="sm" className="gap-2">
              <DownloadIcon className="w-4 h-4" />
              Export
            </Button>
            <Button variant="primary" size="sm" className="gap-2">
              <RefreshIcon className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Global Risk Score"
            value="67.4"
            change="+2.3%"
            changeType="negative"
            subtitle="Composite index"
            icon={<ShieldIcon className="w-6 h-6 text-blue-400" />}
          />
          <KPICard
            title="Active Alerts"
            value="142"
            change="-12%"
            changeType="positive"
            subtitle="Across all regions"
            icon={<AlertIcon className="w-6 h-6 text-amber-400" />}
          />
          <KPICard
            title="Entities Monitored"
            value="8,432"
            change="+156"
            changeType="neutral"
            subtitle="Organizations & assets"
            icon={<BuildingIcon className="w-6 h-6 text-emerald-400" />}
          />
          <KPICard
            title="Model Confidence"
            value="94.2%"
            change="+1.8%"
            changeType="positive"
            subtitle="ML prediction accuracy"
            icon={<BrainIcon className="w-6 h-6 text-purple-400" />}
          />
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Trend Analysis - Full Width on Large */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Risk Trend Analysis</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Multi-dimensional risk scores over time
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-xs bg-gray-800 rounded-md text-gray-400 hover:text-white">
                  Line
                </button>
                <button className="px-3 py-1 text-xs bg-blue-600 rounded-md text-white">
                  Area
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="colorOperational" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFinancial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGeopolitical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="operational"
                    name="Operational"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorOperational)"
                  />
                  <Area
                    type="monotone"
                    dataKey="financial"
                    name="Financial"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorFinancial)"
                  />
                  <Area
                    type="monotone"
                    dataKey="geopolitical"
                    name="Geopolitical"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorGeopolitical)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <p className="text-sm text-gray-500 mt-1">By severity level</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={riskDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {riskDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {riskDistributionData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-400">{item.name}</span>
                    <span className="text-sm font-medium text-white ml-auto">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row of Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sector Risk Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Risk by Sector</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Industry-specific risk assessment
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectorRiskData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                  <YAxis
                    type="category"
                    dataKey="sector"
                    stroke="#9ca3af"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="risk" name="Risk Score" radius={[0, 4, 4, 0]}>
                    {sectorRiskData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.risk >= 70
                            ? "#ef4444"
                            : entry.risk >= 50
                              ? "#f97316"
                              : "#22c55e"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Profile vs Benchmark</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Multidimensional comparison
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="dimension" stroke="#9ca3af" fontSize={11} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="#9ca3af"
                    fontSize={10}
                  />
                  <Radar
                    name="Your Score"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Industry Benchmark"
                    dataKey="benchmark"
                    stroke="#9ca3af"
                    fill="#9ca3af"
                    fillOpacity={0.1}
                  />
                  <Legend />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Regional Analysis Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Regional Risk Analysis</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Comprehensive breakdown by geographic region
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
              View Full Report
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-800/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Incidents (30d)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Monitored Assets
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Coverage
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {regionData.map((region) => (
                    <tr
                      key={region.region}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                            <GlobeIcon className="w-4 h-4 text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-white">
                            {region.region}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full max-w-[100px]">
                            <div
                              className={`h-full rounded-full ${
                                region.riskScore >= 70
                                  ? "bg-red-500"
                                  : region.riskScore >= 50
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{ width: `${region.riskScore}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              region.riskScore >= 70
                                ? "text-red-400"
                                : region.riskScore >= 50
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {region.riskScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {region.incidents.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {region.assets.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full max-w-[60px]">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${region.coverage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">
                            {region.coverage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            region.riskScore >= 70
                              ? "bg-red-500/20 text-red-400"
                              : region.riskScore >= 50
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {region.riskScore >= 70
                            ? "High Alert"
                            : region.riskScore >= 50
                              ? "Monitoring"
                              : "Stable"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Assessments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Risk Assessments</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Latest entity evaluations</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-800">
                {[
                  {
                    entity: "Taiwan Semiconductor Supply Chain",
                    type: "Supply Chain",
                    score: 78,
                    confidence: 92,
                    change: "+5",
                    time: "2 hours ago",
                  },
                  {
                    entity: "European Energy Grid Infrastructure",
                    type: "Critical Infrastructure",
                    score: 65,
                    confidence: 88,
                    change: "-3",
                    time: "4 hours ago",
                  },
                  {
                    entity: "South China Sea Shipping Routes",
                    type: "Maritime Logistics",
                    score: 82,
                    confidence: 95,
                    change: "+8",
                    time: "6 hours ago",
                  },
                  {
                    entity: "Global Rare Earth Supply Network",
                    type: "Commodity",
                    score: 71,
                    confidence: 87,
                    change: "+2",
                    time: "8 hours ago",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.score >= 70
                            ? "bg-red-500/20"
                            : item.score >= 50
                              ? "bg-amber-500/20"
                              : "bg-emerald-500/20"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            item.score >= 70
                              ? "text-red-400"
                              : item.score >= 50
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {item.score}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{item.entity}</p>
                        <p className="text-xs text-gray-500">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">
                          Confidence: <span className="text-white">{item.confidence}%</span>
                        </p>
                        <p
                          className={`text-xs ${
                            item.change.startsWith("+") ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {item.change} from previous
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 w-20 text-right">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainIcon className="w-5 h-5 text-purple-400" />
                <CardTitle>AI Insights</CardTitle>
              </div>
              <p className="text-sm text-gray-500 mt-1">ML-powered recommendations</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    type: "warning",
                    title: "Supply Chain Alert",
                    description:
                      "Elevated risk detected in semiconductor logistics. Consider diversifying suppliers.",
                    confidence: 94,
                  },
                  {
                    type: "info",
                    title: "Pattern Detected",
                    description:
                      "Similar risk trajectory to Q2 2023 energy crisis. Monitor European markets.",
                    confidence: 87,
                  },
                  {
                    type: "success",
                    title: "Risk Reduction",
                    description:
                      "Latin America risk profile improved 15% following policy changes.",
                    confidence: 91,
                  },
                ].map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      insight.type === "warning"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : insight.type === "info"
                          ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-emerald-500/10 border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p
                        className={`text-sm font-medium ${
                          insight.type === "warning"
                            ? "text-amber-400"
                            : insight.type === "info"
                              ? "text-blue-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {insight.title}
                      </p>
                      <span className="text-xs text-gray-500">{insight.confidence}%</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

// Icon Components
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

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

function TrendNeutralIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
