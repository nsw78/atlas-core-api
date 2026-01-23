"use client";

import { useState, useCallback, useMemo } from "react";
import { mockAlerts, type AlertDetail, type AlertSeverity, type AlertCategory, type AlertStatus } from "@/data/alerts";

interface UseAlertsOptions {
  initialAlerts?: AlertDetail[];
}

export function useAlerts(options: UseAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<AlertDetail[]>(options.initialAlerts || mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState<AlertDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const [filterCategory, setFilterCategory] = useState<AlertCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterSeverity !== "all" && alert.severity !== filterSeverity) return false;
      if (filterCategory !== "all" && alert.category !== filterCategory) return false;
      if (filterStatus !== "all" && alert.status !== filterStatus) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterCategory, filterStatus]);

  const unreadCount = useMemo(() => alerts.filter((a) => a.status === "unread").length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === "critical" && a.status !== "dismissed").length, [alerts]);

  const openAlert = useCallback((alert: AlertDetail) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
    // Mark as read when opened
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id && a.status === "unread" ? { ...a, status: "read" as AlertStatus } : a))
    );
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedAlert(null);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "acknowledged" as AlertStatus, updatedAt: new Date().toISOString() } : a))
    );
  }, []);

  const investigateAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "investigating" as AlertStatus, updatedAt: new Date().toISOString() } : a))
    );
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "dismissed" as AlertStatus, updatedAt: new Date().toISOString() } : a))
    );
  }, []);

  const refresh = useCallback(() => {
    // Simulate fetching new data
    setAlerts([...mockAlerts.map((a) => ({ ...a, timestamp: new Date().toISOString() }))]);
  }, []);

  return {
    alerts: filteredAlerts,
    allAlerts: alerts,
    selectedAlert,
    isModalOpen,
    unreadCount,
    criticalCount,
    filterSeverity,
    filterCategory,
    filterStatus,
    setFilterSeverity,
    setFilterCategory,
    setFilterStatus,
    openAlert,
    closeModal,
    acknowledgeAlert,
    investigateAlert,
    dismissAlert,
    refresh,
  };
}
