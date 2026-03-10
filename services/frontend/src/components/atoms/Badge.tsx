"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";
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
  const config: Record<RiskLevel, { variant: BadgeVariant; label: string; dot: string }> = {
    low: { variant: "success", label: "Low", dot: "bg-emerald-400" },
    medium: { variant: "warning", label: "Medium", dot: "bg-amber-400" },
    high: { variant: "danger", label: "High", dot: "bg-red-400" },
    critical: { variant: "danger", label: "Critical", dot: "bg-red-500" },
  };

  const { variant, label, dot } = config[level];
  return (
    <Badge variant={variant} pulse={level === "critical"}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  );
}

// Service Status Badge
export function StatusBadge({ status }: { status: ServiceStatus }) {
  const config: Record<ServiceStatus, { variant: BadgeVariant; label: string; dot: string }> = {
    operational: { variant: "success", label: "Operational", dot: "bg-emerald-400" },
    degraded: { variant: "warning", label: "Degraded", dot: "bg-amber-400" },
    offline: { variant: "danger", label: "Offline", dot: "bg-red-400" },
  };

  const { variant, label, dot } = config[status];
  return (
    <Badge variant={variant}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  );
}
