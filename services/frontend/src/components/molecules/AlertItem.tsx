"use client";

import { cn, formatRelativeTime } from "@/utils";
import { Button } from "@/components/atoms";
import type { Alert } from "@/types";

interface AlertItemProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

export function AlertItem({ alert, onAcknowledge }: AlertItemProps) {
  const typeConfig = {
    critical: {
      bg: "bg-red-900/20 border-red-800/50",
      icon: "text-red-400",
      dot: "bg-red-500",
    },
    warning: {
      bg: "bg-amber-900/20 border-amber-800/50",
      icon: "text-amber-400",
      dot: "bg-amber-500",
    },
    info: {
      bg: "bg-blue-900/20 border-blue-800/50",
      icon: "text-blue-400",
      dot: "bg-blue-500",
    },
  };

  const config = typeConfig[alert.type];

  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        config.bg,
        alert.acknowledged && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 w-2 h-2 rounded-full", config.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-white truncate">
              {alert.title}
            </h4>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatRelativeTime(alert.timestamp)}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-400 line-clamp-2">
            {alert.message}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">Source: {alert.source}</span>

            {!alert.acknowledged && onAcknowledge && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAcknowledge(alert.id)}
              >
                Acknowledge
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
