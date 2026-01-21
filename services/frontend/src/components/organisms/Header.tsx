"use client";

import { useUIStore, usePlatformStore } from "@/store";
import { StatusBadge, Button } from "@/components/atoms";
import { formatDate } from "@/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { status } = usePlatformStore();
  const { notifications } = useUIStore();
  const unreadCount = notifications.filter((n) => !n.acknowledged).length;

  return (
    <header className="h-16 bg-gray-900/50 border-b border-gray-800 backdrop-blur-sm sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-400">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Platform Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">System:</span>
            <StatusBadge status={status} />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-medium flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {/* Current Date */}
          <span className="text-sm text-gray-400">
            {formatDate(new Date().toISOString(), "EEE, MMM d")}
          </span>
        </div>
      </div>
    </header>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
