"use client";

import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils";
import type { RiskLevel, ServiceStatus } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-700 text-gray-200",
  success: "bg-emerald-900/50 text-emerald-400 border-emerald-700/50",
  warning: "bg-amber-900/50 text-amber-400 border-amber-700/50",
  danger: "bg-red-900/50 text-red-400 border-red-700/50",
  info: "bg-blue-900/50 text-blue-400 border-blue-700/50",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
          variantStyles[variant],
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
  const config: Record<RiskLevel, { variant: BadgeVariant; label: string }> = {
    low: { variant: "success", label: "Low" },
    medium: { variant: "warning", label: "Medium" },
    high: { variant: "danger", label: "High" },
    critical: { variant: "danger", label: "Critical" },
  };

  const { variant, label } = config[level];
  return <Badge variant={variant}>{label}</Badge>;
}

// Service Status Badge
export function StatusBadge({ status }: { status: ServiceStatus }) {
  const config: Record<ServiceStatus, { variant: BadgeVariant; label: string }> =
    {
      operational: { variant: "success", label: "Operational" },
      degraded: { variant: "warning", label: "Degraded" },
      offline: { variant: "danger", label: "Offline" },
    };

  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
