"use client";

import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/atoms";

export default function GeospatialPage() {
  return (
    <MainLayout
      title="Geospatial Intelligence"
      subtitle="Global infrastructure and risk visualization"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardContent className="h-full p-0">
              <div className="h-full flex items-center justify-center bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                <div className="text-center">
                  <GlobeIcon className="w-16 h-16 mx-auto text-gray-600" />
                  <p className="mt-4 text-lg text-gray-400">
                    Geospatial Map View
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure MAPBOX_TOKEN to enable interactive map
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Layer Controls */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Map Layers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { id: "infrastructure", label: "Infrastructure", active: true },
                { id: "energy", label: "Energy Grid", active: true },
                { id: "logistics", label: "Logistics Routes", active: false },
                { id: "risk-zones", label: "Risk Zones", active: true },
              ].map((layer) => (
                <label
                  key={layer.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked={layer.active}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  <span className="text-sm text-gray-300">{layer.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Risk Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { color: "bg-emerald-500", label: "Low Risk" },
                { color: "bg-amber-500", label: "Medium Risk" },
                { color: "bg-orange-500", label: "High Risk" },
                { color: "bg-red-500", label: "Critical Risk" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-400">{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Selected Feature Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Selected Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="text-sm text-white">European Energy Hub</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm text-white">Critical Infrastructure</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Risk Level</p>
                  <Badge variant="warning">High</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge variant="success">Operational</Badge>
                </div>
                <Button variant="secondary" size="sm" className="w-full mt-2">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Monitored Sites</span>
                <span className="text-sm font-medium text-white">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Active Alerts</span>
                <span className="text-sm font-medium text-red-400">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Risk Zones</span>
                <span className="text-sm font-medium text-amber-400">156</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function GlobeIcon({ className }: { className?: string }) {
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
        strokeWidth={1}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
