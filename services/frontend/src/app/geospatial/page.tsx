"use client";

import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/atoms";

// Types
interface MapLayer {
  id: string;
  name: string;
  icon: React.ReactNode;
  active: boolean;
  opacity: number;
  color: string;
  count: number;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  location: string;
  coordinates: [number, number];
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "operational" | "warning" | "offline";
  lastUpdated: string;
}

interface Alert {
  id: string;
  title: string;
  location: string;
  severity: "info" | "warning" | "critical";
  time: string;
  coordinates: [number, number];
}

// Mock data
const initialLayers: MapLayer[] = [
  { id: "infrastructure", name: "Critical Infrastructure", icon: <BuildingIcon className="w-4 h-4" />, active: true, opacity: 100, color: "#3b82f6", count: 1247 },
  { id: "energy", name: "Energy Grid", icon: <BoltIcon className="w-4 h-4" />, active: true, opacity: 85, color: "#f59e0b", count: 892 },
  { id: "logistics", name: "Supply Chain Routes", icon: <TruckIcon className="w-4 h-4" />, active: true, opacity: 70, color: "#10b981", count: 3456 },
  { id: "maritime", name: "Maritime Routes", icon: <ShipIcon className="w-4 h-4" />, active: false, opacity: 60, color: "#06b6d4", count: 567 },
  { id: "risk-zones", name: "Risk Zones", icon: <ShieldIcon className="w-4 h-4" />, active: true, opacity: 50, color: "#ef4444", count: 234 },
  { id: "satellites", name: "Satellite Coverage", icon: <SatelliteIcon className="w-4 h-4" />, active: false, opacity: 40, color: "#8b5cf6", count: 48 },
];

const assets: Asset[] = [
  { id: "1", name: "European Energy Hub", type: "Power Plant", location: "Frankfurt, DE", coordinates: [8.6821, 50.1109], riskLevel: "high", status: "operational", lastUpdated: "2 min ago" },
  { id: "2", name: "Rotterdam Port Complex", type: "Maritime Hub", location: "Rotterdam, NL", coordinates: [4.4777, 51.9244], riskLevel: "medium", status: "operational", lastUpdated: "5 min ago" },
  { id: "3", name: "TSMC Fab 18", type: "Semiconductor", location: "Tainan, TW", coordinates: [120.2133, 22.9998], riskLevel: "critical", status: "warning", lastUpdated: "1 min ago" },
  { id: "4", name: "Suez Canal Authority", type: "Chokepoint", location: "Suez, EG", coordinates: [32.5498, 29.9668], riskLevel: "high", status: "operational", lastUpdated: "8 min ago" },
  { id: "5", name: "Singapore Data Center", type: "Digital Infra", location: "Singapore, SG", coordinates: [103.8198, 1.3521], riskLevel: "low", status: "operational", lastUpdated: "3 min ago" },
];

const alerts: Alert[] = [
  { id: "1", title: "Elevated seismic activity detected", location: "Taiwan Strait", severity: "critical", time: "2 min ago", coordinates: [119.5, 24.0] },
  { id: "2", title: "Shipping lane congestion", location: "Strait of Malacca", severity: "warning", time: "15 min ago", coordinates: [101.0, 2.5] },
  { id: "3", title: "Power grid fluctuation", location: "Central Europe", severity: "warning", time: "32 min ago", coordinates: [10.0, 51.0] },
  { id: "4", title: "New trade restriction", location: "South China Sea", severity: "info", time: "1 hour ago", coordinates: [114.0, 12.0] },
];

// World regions for the interactive map
const worldRegions = [
  { id: "na", name: "North America", path: "M 50 80 L 180 80 L 180 180 L 50 180 Z", risk: 45, assets: 3120 },
  { id: "sa", name: "South America", path: "M 100 200 L 160 200 L 160 320 L 100 320 Z", risk: 38, assets: 670 },
  { id: "eu", name: "Europe", path: "M 220 70 L 320 70 L 320 150 L 220 150 Z", risk: 58, assets: 1890 },
  { id: "af", name: "Africa", path: "M 220 160 L 320 160 L 320 280 L 220 280 Z", risk: 64, assets: 420 },
  { id: "me", name: "Middle East", path: "M 320 100 L 400 100 L 400 180 L 320 180 Z", risk: 81, assets: 890 },
  { id: "as", name: "Asia", path: "M 380 60 L 520 60 L 520 180 L 380 180 Z", risk: 72, assets: 2340 },
  { id: "oc", name: "Oceania", path: "M 450 200 L 540 200 L 540 280 L 450 280 Z", risk: 32, assets: 450 },
];

export default function GeospatialPage() {
  const [layers, setLayers] = useState<MapLayer[]>(initialLayers);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(assets[0] ?? null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>("as");
  const [mapMode, setMapMode] = useState<"2d" | "3d" | "satellite">("2d");
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleLayer = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, active: !layer.active } : layer
      )
    );
  }, []);

  const updateLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
  }, []);

  const activeLayersCount = layers.filter((l) => l.active).length;

  return (
    <MainLayout
      title="Geospatial Intelligence"
      subtitle="Global infrastructure monitoring and risk visualization"
    >
      <div className="space-y-4">
        {/* Top Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search and Quick Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search locations, assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Regions</option>
              <option value="na">North America</option>
              <option value="eu">Europe</option>
              <option value="as">Asia Pacific</option>
              <option value="me">Middle East</option>
            </select>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Asset Types</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="energy">Energy</option>
              <option value="maritime">Maritime</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          {/* Map Controls */}
          <div className="flex items-center gap-3">
            {/* Map Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
              {(["2d", "3d", "satellite"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMapMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    mapMode === mode
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            <Button variant="secondary" size="sm" className="gap-2">
              <LayersIcon className="w-4 h-4" />
              {activeLayersCount} Layers
            </Button>
            <Button variant="secondary" size="sm" className="gap-2">
              <DownloadIcon className="w-4 h-4" />
              Export
            </Button>
            <Button variant="primary" size="sm" className="gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Marker
            </Button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Monitored Assets", value: "8,247", change: "+124", positive: true },
            { label: "Active Alerts", value: "47", change: "-8", positive: true },
            { label: "Risk Zones", value: "156", change: "+3", positive: false },
            { label: "Shipping Routes", value: "892", change: "0", positive: true },
            { label: "Coverage", value: "94.2%", change: "+1.2%", positive: true },
            { label: "Data Freshness", value: "< 5min", change: "", positive: true },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-semibold text-white">{stat.value}</span>
                {stat.change && (
                  <span className={`text-xs ${stat.positive ? "text-emerald-400" : "text-red-400"}`}>
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "calc(100vh - 340px)" }}>
          {/* Map Container */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <Card className="flex-1">
              <CardContent className="h-full p-2">
                {/* Interactive World Map */}
                <div className="relative h-full bg-gray-900 rounded-lg overflow-hidden">
                  {/* Map Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

                  {/* Grid Lines */}
                  <svg className="absolute inset-0 w-full h-full opacity-20">
                    {[...Array(12)].map((_, i) => (
                      <line key={`v-${i}`} x1={`${(i + 1) * 8}%`} y1="0" x2={`${(i + 1) * 8}%`} y2="100%" stroke="#4b5563" strokeWidth="0.5" />
                    ))}
                    {[...Array(8)].map((_, i) => (
                      <line key={`h-${i}`} x1="0" y1={`${(i + 1) * 12}%`} x2="100%" y2={`${(i + 1) * 12}%`} stroke="#4b5563" strokeWidth="0.5" />
                    ))}
                  </svg>

                  {/* World Map SVG */}
                  <svg viewBox="0 0 600 350" className="absolute inset-0 w-full h-full">
                    {/* Regions */}
                    {worldRegions.map((region) => (
                      <g key={region.id}>
                        <path
                          d={region.path}
                          fill={selectedRegion === region.id ? "#3b82f6" : "#374151"}
                          fillOpacity={selectedRegion === region.id ? 0.5 : 0.3}
                          stroke={selectedRegion === region.id ? "#3b82f6" : "#4b5563"}
                          strokeWidth={selectedRegion === region.id ? 2 : 1}
                          className="cursor-pointer transition-all duration-200 hover:fill-blue-500/30"
                          onClick={() => setSelectedRegion(region.id)}
                        />
                        {/* Region Label */}
                        <text
                          x={parseInt(region.path.split(" ")[1] ?? "0") + 30}
                          y={parseInt(region.path.split(" ")[2] ?? "0") + 40}
                          fill="#9ca3af"
                          fontSize="10"
                          className="pointer-events-none"
                        >
                          {region.name}
                        </text>
                      </g>
                    ))}

                    {/* Asset Markers */}
                    {layers.find(l => l.id === "infrastructure")?.active && assets.map((asset) => (
                      <g key={asset.id} className="cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                        <circle
                          cx={(asset.coordinates[0] + 180) * (600 / 360)}
                          cy={(90 - asset.coordinates[1]) * (350 / 180)}
                          r={selectedAsset?.id === asset.id ? 8 : 5}
                          fill={
                            asset.riskLevel === "critical" ? "#ef4444" :
                            asset.riskLevel === "high" ? "#f97316" :
                            asset.riskLevel === "medium" ? "#eab308" : "#22c55e"
                          }
                          className="transition-all duration-200"
                        />
                        {selectedAsset?.id === asset.id && (
                          <circle
                            cx={(asset.coordinates[0] + 180) * (600 / 360)}
                            cy={(90 - asset.coordinates[1]) * (350 / 180)}
                            r="12"
                            fill="none"
                            stroke={
                              asset.riskLevel === "critical" ? "#ef4444" :
                              asset.riskLevel === "high" ? "#f97316" :
                              asset.riskLevel === "medium" ? "#eab308" : "#22c55e"
                            }
                            strokeWidth="2"
                            className="animate-ping"
                          />
                        )}
                      </g>
                    ))}

                    {/* Alert Markers */}
                    {alerts.filter(a => a.severity === "critical").map((alert) => (
                      <g key={alert.id}>
                        <circle
                          cx={(alert.coordinates[0] + 180) * (600 / 360)}
                          cy={(90 - alert.coordinates[1]) * (350 / 180)}
                          r="15"
                          fill="#ef4444"
                          fillOpacity="0.2"
                          className="animate-pulse"
                        />
                        <circle
                          cx={(alert.coordinates[0] + 180) * (600 / 360)}
                          cy={(90 - alert.coordinates[1]) * (350 / 180)}
                          r="6"
                          fill="#ef4444"
                        />
                      </g>
                    ))}

                    {/* Shipping Routes (if layer active) */}
                    {layers.find(l => l.id === "logistics")?.active && (
                      <g>
                        <path
                          d="M 460 140 Q 420 180 350 170 Q 280 160 260 120"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity={layers.find(l => l.id === "logistics")?.opacity ?? 70 / 100}
                        />
                        <path
                          d="M 490 200 Q 450 230 380 240 Q 300 250 260 240"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity={layers.find(l => l.id === "logistics")?.opacity ?? 70 / 100}
                        />
                      </g>
                    )}
                  </svg>

                  {/* Map Controls Overlay */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">
                      <PlusIcon className="w-4 h-4 text-white" />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">
                      <MinusIcon className="w-4 h-4 text-white" />
                    </button>
                    <button className="p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors">
                      <ExpandIcon className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Region Info Overlay */}
                  {selectedRegion && (
                    <div className="absolute bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4 min-w-[200px]">
                      <h4 className="text-sm font-medium text-white">
                        {worldRegions.find(r => r.id === selectedRegion)?.name}
                      </h4>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Risk Score:</span>
                          <span className={`font-medium ${
                            (worldRegions.find(r => r.id === selectedRegion)?.risk ?? 0) >= 70 ? "text-red-400" :
                            (worldRegions.find(r => r.id === selectedRegion)?.risk ?? 0) >= 50 ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {worldRegions.find(r => r.id === selectedRegion)?.risk}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Assets:</span>
                          <span className="text-white">{worldRegions.find(r => r.id === selectedRegion)?.assets.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Coordinates Display */}
                  <div className="absolute bottom-4 right-4 bg-gray-900/90 px-3 py-1.5 rounded text-xs text-gray-400 font-mono">
                    {selectedAsset ? `${selectedAsset.coordinates[1].toFixed(4)}°N, ${selectedAsset.coordinates[0].toFixed(4)}°E` : "Hover for coordinates"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Slider */}
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 w-20">Historical</span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={timelinePosition}
                      onChange={(e) => setTimelinePosition(parseInt(e.target.value))}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>-30 days</span>
                      <span>-7 days</span>
                      <span>-24h</span>
                      <span className="text-blue-400 font-medium">Now</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <PlayIcon className="w-4 h-4" />
                    Playback
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 overflow-y-auto">
            {/* Layer Controls */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Map Layers</CardTitle>
                  <Badge variant="default">{activeLayersCount} active</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[220px] overflow-y-auto">
                {layers.map((layer) => (
                  <div key={layer.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={layer.active}
                          onChange={() => toggleLayer(layer.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-gray-400">{layer.icon}</span>
                        <span className="text-sm text-gray-300">{layer.name}</span>
                      </label>
                      <span className="text-xs text-gray-500">{layer.count}</span>
                    </div>
                    {layer.active && (
                      <div className="flex items-center gap-2 pl-6">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={layer.opacity}
                          onChange={(e) => updateLayerOpacity(layer.id, parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs text-gray-500 w-8">{layer.opacity}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Real-time Alerts */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Live Alerts</CardTitle>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[180px] overflow-y-auto">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      alert.severity === "critical"
                        ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                        : alert.severity === "warning"
                          ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                          : "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-medium ${
                          alert.severity === "critical" ? "text-red-400" :
                          alert.severity === "warning" ? "text-amber-400" : "text-blue-400"
                        }`}>
                          {alert.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.location}</p>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Selected Asset Details */}
            {selectedAsset && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Asset Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm text-white font-medium">{selectedAsset.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm text-gray-300">{selectedAsset.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-sm text-gray-300">{selectedAsset.location}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Risk Level</p>
                      <Badge variant={
                        selectedAsset.riskLevel === "critical" ? "danger" :
                        selectedAsset.riskLevel === "high" ? "warning" :
                        selectedAsset.riskLevel === "medium" ? "warning" : "success"
                      }>
                        {selectedAsset.riskLevel.charAt(0).toUpperCase() + selectedAsset.riskLevel.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <Badge variant={selectedAsset.status === "operational" ? "success" : "warning"}>
                        {selectedAsset.status.charAt(0).toUpperCase() + selectedAsset.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Coordinates</p>
                    <p className="text-sm text-gray-400 font-mono">
                      {selectedAsset.coordinates[1].toFixed(4)}°N, {selectedAsset.coordinates[0].toFixed(4)}°E
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p className="text-sm text-gray-400">{selectedAsset.lastUpdated}</p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="secondary" size="sm" className="flex-1">
                      View History
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1">
                      Full Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Legend */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Risk Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { color: "bg-emerald-500", label: "Low Risk", range: "0-25" },
                  { color: "bg-amber-500", label: "Medium Risk", range: "26-50" },
                  { color: "bg-orange-500", label: "High Risk", range: "51-75" },
                  { color: "bg-red-500", label: "Critical Risk", range: "76-100" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                    <span className="text-xs text-gray-500">{item.range}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Icon Components
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 100 4 2 2 0 000-4zm8 0a2 2 0 100 4 2 2 0 000-4zM2 5h12l4 6h2a2 2 0 012 2v3a2 2 0 01-2 2h-1" />
    </svg>
  );
}

function ShipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17l6-6m0 0l6 6m-6-6v12M21 7l-6 6m0 0L9 7m6 6V1" />
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

function SatelliteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
