"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/atoms";
import { cn } from "@/utils";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  category: string;
}

interface ThreatTimelineProps {
  events: TimelineEvent[];
  className?: string;
  maxItems?: number;
  onEventClick?: (event: TimelineEvent) => void;
}

const severityConfig = {
  critical: {
    dot: "bg-red-500",
    line: "border-red-500/30",
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    pulse: "bg-red-500/40",
  },
  high: {
    dot: "bg-orange-500",
    line: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    pulse: "bg-orange-500/40",
  },
  medium: {
    dot: "bg-yellow-500",
    line: "border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    pulse: "bg-yellow-500/40",
  },
  low: {
    dot: "bg-emerald-500",
    line: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    pulse: "bg-emerald-500/40",
  },
};

export function ThreatTimeline({
  events,
  className,
  maxItems = 10,
  onEventClick,
}: ThreatTimelineProps) {
  const displayEvents = events.slice(0, maxItems);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-700/50" />

          <div className="space-y-1">
            {displayEvents.map((event, index) => {
              const config = severityConfig[event.severity];

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onEventClick?.(event)}
                  className="relative flex gap-4 p-3 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors group"
                >
                  {/* Timeline dot */}
                  <div className="relative flex-shrink-0 mt-1.5">
                    <div className={cn("w-3 h-3 rounded-full z-10 relative", config.dot)} />
                    {index === 0 && (
                      <div
                        className={cn(
                          "absolute inset-0 w-3 h-3 rounded-full animate-ping",
                          config.pulse
                        )}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                          {event.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {event.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full border uppercase tracking-wider",
                          config.badge
                        )}
                      >
                        {event.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-600">{event.timestamp}</span>
                      <span className="text-[10px] text-gray-600">{event.source}</span>
                      <span className="text-[10px] text-cyan-500/70">{event.category}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
