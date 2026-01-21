"use client";

import { cn } from "@/utils";
import type { RiskLevel } from "@/types";

interface RiskGaugeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getRiskLevel(score: number): RiskLevel {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "critical";
}

const riskColors: Record<RiskLevel, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

const sizes = {
  sm: { width: 80, strokeWidth: 8 },
  md: { width: 120, strokeWidth: 10 },
  lg: { width: 160, strokeWidth: 12 },
};

export function RiskGauge({
  score,
  size = "md",
  showLabel = true,
  className,
}: RiskGaugeProps) {
  const riskLevel = getRiskLevel(score);
  const color = riskColors[riskLevel];
  const { width, strokeWidth } = sizes[size];

  const radius = (width - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        width={width}
        height={width / 2 + 10}
        viewBox={`0 0 ${width} ${width / 2 + 10}`}
      >
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${width / 2}`}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${width / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />

        {/* Score text */}
        <text
          x={width / 2}
          y={width / 2 - 5}
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: size === "sm" ? "18px" : size === "md" ? "24px" : "32px" }}
        >
          {Math.round(score)}
        </text>
      </svg>

      {showLabel && (
        <span
          className="mt-1 text-sm font-medium capitalize"
          style={{ color }}
        >
          {riskLevel} Risk
        </span>
      )}
    </div>
  );
}
