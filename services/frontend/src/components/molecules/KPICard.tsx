"use client";

import { Card, CardContent, RiskBadge } from "@/components/atoms";
import { cn, formatNumber, formatPercent } from "@/utils";
import type { KPI } from "@/types";

interface KPICardProps {
  kpi: KPI;
  className?: string;
}

export function KPICard({ kpi, className }: KPICardProps) {
  const TrendIcon = kpi.trend === "up" ? TrendUpIcon : kpi.trend === "down" ? TrendDownIcon : TrendStableIcon;
  const trendColor = kpi.trend === "up" ? "text-emerald-400" : kpi.trend === "down" ? "text-red-400" : "text-gray-400";

  return (
    <Card className={cn("hover:border-gray-600 transition-colors", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">
              {typeof kpi.value === "number"
                ? formatNumber(kpi.value)
                : kpi.value}
              <span className="text-sm font-normal text-gray-500 ml-1">
                {kpi.unit}
              </span>
            </p>
          </div>
          <RiskBadge level={kpi.status} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className={cn("flex items-center gap-1", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatPercent(Math.abs(kpi.trendValue))}
            </span>
          </div>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>

        {kpi.description && (
          <p className="mt-3 text-xs text-gray-500 line-clamp-2">
            {kpi.description}
          </p>
        )}
      </CardContent>
    </Card>
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

function TrendStableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}
