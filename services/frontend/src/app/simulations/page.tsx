"use client";

import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/atoms";

export default function SimulationsPage() {
  return (
    <MainLayout
      title="Scenario Simulations"
      subtitle="What-if analysis and impact modeling"
    >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Types</option>
              <option>Economic</option>
              <option>Infrastructure</option>
              <option>Supply Chain</option>
              <option>Policy</option>
              <option>Climate</option>
            </select>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>Draft</option>
              <option>Running</option>
              <option>Completed</option>
            </select>
          </div>
          <Button>Create Scenario</Button>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              id: "1",
              name: "Taiwan Strait Blockade",
              type: "supply_chain",
              status: "completed",
              impact: { economic: -4.2, infrastructure: -2.1 },
              confidence: 87,
            },
            {
              id: "2",
              name: "European Energy Crisis",
              type: "infrastructure",
              status: "running",
              impact: { economic: -3.1, infrastructure: -5.8 },
              confidence: 92,
            },
            {
              id: "3",
              name: "US-China Tech Decoupling",
              type: "economic",
              status: "completed",
              impact: { economic: -2.8, infrastructure: -1.2 },
              confidence: 78,
            },
            {
              id: "4",
              name: "Climate Migration Wave",
              type: "climate",
              status: "draft",
              impact: null,
              confidence: null,
            },
            {
              id: "5",
              name: "CBDC Implementation",
              type: "policy",
              status: "completed",
              impact: { economic: 1.2, infrastructure: -0.5 },
              confidence: 65,
            },
          ].map((scenario) => (
            <Card
              key={scenario.id}
              className="hover:border-gray-600 transition-colors cursor-pointer"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge
                    variant={
                      scenario.status === "completed"
                        ? "success"
                        : scenario.status === "running"
                          ? "warning"
                          : "default"
                    }
                  >
                    {scenario.status}
                  </Badge>
                  <span className="text-xs text-gray-500 capitalize">
                    {scenario.type.replace("_", " ")}
                  </span>
                </div>

                <h3 className="text-lg font-medium text-white mb-2">
                  {scenario.name}
                </h3>

                {scenario.impact ? (
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Economic Impact</span>
                      <span
                        className={
                          scenario.impact.economic < 0
                            ? "text-red-400"
                            : "text-emerald-400"
                        }
                      >
                        {scenario.impact.economic > 0 ? "+" : ""}
                        {scenario.impact.economic}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Infrastructure</span>
                      <span
                        className={
                          scenario.impact.infrastructure < 0
                            ? "text-red-400"
                            : "text-emerald-400"
                        }
                      >
                        {scenario.impact.infrastructure > 0 ? "+" : ""}
                        {scenario.impact.infrastructure}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-800">
                      <span className="text-gray-400">Confidence</span>
                      <span className="text-white">{scenario.confidence}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mt-4">
                    No results yet. Run simulation to generate impact analysis.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Section */}
        <Card>
          <CardHeader>
            <CardTitle>Scenario Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
              <div className="text-center">
                <CompareIcon className="w-12 h-12 mx-auto text-gray-600" />
                <p className="mt-2 text-sm text-gray-500">
                  Select 2+ completed scenarios to compare impacts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function CompareIcon({ className }: { className?: string }) {
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
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
