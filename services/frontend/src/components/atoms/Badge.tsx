"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";
import { useI18n } from "@/i18n";
import type { RiskLevel, ServiceStatus } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "violet";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-800/80 text-gray-300 border-white/[0.08]",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", pulse = false, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border tracking-wide",
          variantStyles[variant],
          pulse && "animate-pulse",
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

// Risk Level Badge
export function RiskBadge({ level }: { level: RiskLevel }) {
  const { t } = useI18n();
  const config: Record<RiskLevel, { variant: BadgeVariant; labelKey: string; dot: string }> = {
    low: { variant: "success", labelKey: "badges.low", dot: "bg-emerald-400" },
    medium: { variant: "warning", labelKey: "badges.medium", dot: "bg-amber-400" },
    high: { variant: "danger", labelKey: "badges.high", dot: "bg-red-400" },
    critical: { variant: "danger", labelKey: "badges.critical", dot: "bg-red-500" },
  };

  const { variant, labelKey, dot } = config[level];
  return (
    <Badge variant={variant} pulse={level === "critical"}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {t(labelKey)}
    </Badge>
  );
}

// Service Status Badge
export function StatusBadge({ status }: { status: ServiceStatus }) {
  const { t } = useI18n();
  const config: Record<ServiceStatus, { variant: BadgeVariant; labelKey: string; dot: string }> = {
    operational: { variant: "success", labelKey: "badges.operational", dot: "bg-emerald-400" },
    degraded: { variant: "warning", labelKey: "badges.degraded", dot: "bg-amber-400" },
    offline: { variant: "danger", labelKey: "badges.offline", dot: "bg-red-400" },
  };

  const { variant, labelKey, dot } = config[status];
  return (
    <Badge variant={variant}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {t(labelKey)}
    </Badge>
  );
}
