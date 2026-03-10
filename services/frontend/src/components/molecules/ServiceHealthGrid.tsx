"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/atoms";
import { cn } from "@/utils";

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  uptime: number;
  version: string;
  lastCheck: string;
}

interface ServiceHealthGridProps {
  services: ServiceHealth[];
  className?: string;
  onServiceClick?: (service: ServiceHealth) => void;
}

const statusConfig = {
  healthy: {
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
    label: "Healthy",
  },
  degraded: {
    bg: "bg-yellow-500/10 border-yellow-500/20",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
    label: "Degraded",
  },
  unhealthy: {
    bg: "bg-red-500/10 border-red-500/20",
    dot: "bg-red-500",
    text: "text-red-400",
    label: "Unhealthy",
  },
};

export function ServiceHealthGrid({
  services,
  className,
  onServiceClick,
}: ServiceHealthGridProps) {
  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const totalCount = services.length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        {/* Summary bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                healthyCount === totalCount ? "bg-emerald-500" : "bg-yellow-500"
              )}
            />
            <span className="text-sm font-medium text-gray-300">
              {healthyCount}/{totalCount} Services Operational
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Uptime: {((healthyCount / totalCount) * 100).toFixed(1)}%
          </span>
        </div>

        {/* Service grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {services.map((service, index) => {
            const config = statusConfig[service.status];

            return (
              <motion.button
                key={service.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onServiceClick?.(service)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all hover:ring-1 hover:ring-white/10",
                  config.bg
                )}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
                  <span className="text-xs font-medium text-gray-300 truncate">
                    {service.name}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className={cn("text-lg font-bold tabular-nums", config.text)}>
                    {service.latencyMs}
                    <span className="text-[10px] font-normal text-gray-500">ms</span>
                  </span>
                  <span className="text-[10px] text-gray-600">v{service.version}</span>
                </div>

                <div className="mt-1">
                  <div className="w-full h-1 rounded-full bg-gray-800">
                    <div
                      className={cn("h-full rounded-full transition-all", config.dot)}
                      style={{ width: `${service.uptime}%` }}
                    />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
