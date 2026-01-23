"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseAutoRefreshOptions {
  defaultInterval?: number; // in seconds
  onRefresh: () => void;
  enabled?: boolean;
}

export function useAutoRefresh({ defaultInterval = 30, onRefresh, enabled = true }: UseAutoRefreshOptions) {
  const [interval, setInterval_] = useState(defaultInterval);
  const [isActive, setIsActive] = useState(enabled);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [countdown, setCountdown] = useState(defaultInterval);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const doRefresh = useCallback(() => {
    onRefresh();
    setLastRefresh(new Date());
    setCountdown(interval);
  }, [onRefresh, interval]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (isActive && interval > 0) {
      timerRef.current = globalThis.setInterval(doRefresh, interval * 1000);
      countdownRef.current = globalThis.setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? interval : prev - 1));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isActive, interval, doRefresh]);

  const toggleActive = useCallback(() => setIsActive((prev) => !prev), []);

  const setIntervalSeconds = useCallback((seconds: number) => {
    setInterval_(seconds);
    setCountdown(seconds);
  }, []);

  const manualRefresh = useCallback(() => {
    doRefresh();
  }, [doRefresh]);

  return {
    isActive,
    interval,
    countdown,
    lastRefresh,
    toggleActive,
    setInterval: setIntervalSeconds,
    manualRefresh,
  };
}
