"use client";

import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button } from "@/components/atoms";

export default function AnalyticsPage() {
  return (
    <MainLayout
      title="Analytics"
      subtitle="Deep dive into strategic intelligence data"
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>Custom range</option>
                </select>
                <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>All Regions</option>
                  <option>Americas</option>
                  <option>Europe</option>
                  <option>Asia Pacific</option>
                  <option>Middle East</option>
                </select>
                <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>All Risk Levels</option>
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <Button variant="secondary" size="sm">
                Export Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Series Chart Placeholder */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risk Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-center justify-center bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
                <div className="text-center">
                  <ChartIcon className="w-12 h-12 mx-auto text-gray-600" />
                  <p className="mt-2 text-sm text-gray-500">
                    Time series chart - Connect to live data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sector Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk by Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { sector: "Energy", value: 78, color: "bg-red-500" },
                  { sector: "Finance", value: 65, color: "bg-amber-500" },
                  { sector: "Technology", value: 52, color: "bg-amber-500" },
                  { sector: "Healthcare", value: 34, color: "bg-emerald-500" },
                  { sector: "Infrastructure", value: 81, color: "bg-red-500" },
                ].map((item) => (
                  <div key={item.sector} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{item.sector}</span>
                      <span className="text-white font-medium">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk by Region</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { region: "Asia Pacific", value: 72, alerts: 12 },
                  { region: "Europe", value: 58, alerts: 8 },
                  { region: "North America", value: 45, alerts: 5 },
                  { region: "Middle East", value: 81, alerts: 15 },
                  { region: "South America", value: 38, alerts: 3 },
                ].map((item) => (
                  <div
                    key={item.region}
                    className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-white">{item.region}</p>
                      <p className="text-xs text-gray-500">
                        {item.alerts} active alerts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">
                        {item.value}
                      </p>
                      <p className="text-xs text-gray-500">Risk Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Generated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    {
                      entity: "Taiwan Semiconductor Supply Chain",
                      type: "Supply Chain",
                      score: 78,
                      confidence: 92,
                      date: "2 hours ago",
                    },
                    {
                      entity: "European Energy Grid",
                      type: "Infrastructure",
                      score: 65,
                      confidence: 88,
                      date: "4 hours ago",
                    },
                    {
                      entity: "South China Sea Shipping Routes",
                      type: "Logistics",
                      score: 82,
                      confidence: 95,
                      date: "6 hours ago",
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-sm text-white">
                        {row.entity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {row.type}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-sm font-medium ${
                            row.score >= 70
                              ? "text-red-400"
                              : row.score >= 50
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }`}
                        >
                          {row.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {row.confidence}%
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {row.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  );
}
