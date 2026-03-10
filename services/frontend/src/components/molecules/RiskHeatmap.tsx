"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/atoms";
import { cn } from "@/utils";

interface HeatmapCell {
  region: string;
  dimension: string;
  score: number;
  trend: "increasing" | "decreasing" | "stable";
}

interface RiskHeatmapProps {
  data: HeatmapCell[];
  regions: string[];
  dimensions: string[];
  className?: string;
  onCellClick?: (cell: HeatmapCell) => void;
}

function getHeatColor(score: number): string {
  if (score >= 0.8) return "bg-red-500/90";
  if (score >= 0.6) return "bg-orange-500/80";
  if (score >= 0.4) return "bg-yellow-500/70";
  if (score >= 0.2) return "bg-emerald-500/60";
  return "bg-emerald-600/50";
}

function getTextColor(score: number): string {
  if (score >= 0.6) return "text-white";
  return "text-gray-900";
}

function getTrendIndicator(trend: string): string {
  if (trend === "increasing") return "\u2191";
  if (trend === "decreasing") return "\u2193";
  return "\u2192";
}

export function RiskHeatmap({
  data,
  regions,
  dimensions,
  className,
  onCellClick,
}: RiskHeatmapProps) {
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of data) {
      map.set(`${cell.region}-${cell.dimension}`, cell);
    }
    return map;
  }, [data]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 sticky left-0 z-10">
                  Region
                </th>
                {dimensions.map((dim) => (
                  <th
                    key={dim}
                    className="p-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50"
                  >
                    {dim}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regions.map((region, rowIdx) => (
                <tr key={region} className="border-t border-gray-800/50">
                  <td className="p-3 text-sm font-medium text-gray-300 whitespace-nowrap bg-gray-900/50 sticky left-0 z-10">
                    {region}
                  </td>
                  {dimensions.map((dim, colIdx) => {
                    const cell = cellMap.get(`${region}-${dim}`);
                    const score = cell?.score ?? 0;
                    const trend = cell?.trend ?? "stable";

                    return (
                      <td key={dim} className="p-1">
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: (rowIdx * dimensions.length + colIdx) * 0.02,
                          }}
                          onClick={() => cell && onCellClick?.(cell)}
                          className={cn(
                            "w-full h-12 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-all hover:ring-2 hover:ring-white/30",
                            getHeatColor(score),
                            getTextColor(score)
                          )}
                        >
                          <span className="text-sm font-bold">
                            {(score * 100).toFixed(0)}
                          </span>
                          <span className="text-xs opacity-80">
                            {getTrendIndicator(trend)}
                          </span>
                        </motion.button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 p-3 bg-gray-800/30 border-t border-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Low</span>
            <div className="flex gap-0.5">
              <div className="w-6 h-3 rounded-sm bg-emerald-600/50" />
              <div className="w-6 h-3 rounded-sm bg-emerald-500/60" />
              <div className="w-6 h-3 rounded-sm bg-yellow-500/70" />
              <div className="w-6 h-3 rounded-sm bg-orange-500/80" />
              <div className="w-6 h-3 rounded-sm bg-red-500/90" />
            </div>
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{"\u2191"} Increasing</span>
            <span>{"\u2192"} Stable</span>
            <span>{"\u2193"} Decreasing</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
