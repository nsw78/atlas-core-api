"use client";

import { useMemo } from "react";
import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/atoms";
import { useI18n } from "@/i18n";
import { useApiQuery } from "@/hooks/useApi";
import { compliance } from "@/sdk/endpoints";

// Mock data for fallback
const mockComplianceStatus = [
  { framework: "GDPR", status: "compliant", lastAudit: "2024-01-15", findings: 0 },
  { framework: "LGPD", status: "compliant", lastAudit: "2024-01-10", findings: 2 },
  { framework: "SOC 2", status: "compliant", lastAudit: "2023-12-20", findings: 1 },
  { framework: "ISO 27001", status: "review-required", lastAudit: "2023-11-30", findings: 5 },
];

const mockAuditLogs = [
  { time: "14:32:15", user: "john.analyst", action: "view", resource: "Risk Assessment #2847" },
  { time: "14:28:42", user: "maria.exec", action: "export", resource: "Dashboard Report" },
  { time: "14:15:08", user: "chen.analyst", action: "create", resource: "Scenario Simulation" },
  { time: "13:58:33", user: "admin", action: "update", resource: "User Permissions" },
  { time: "13:45:21", user: "john.analyst", action: "simulate", resource: "Taiwan Blockade Scenario" },
];

export default function CompliancePage() {
  const { t } = useI18n();

  // --- API calls with fallback to mock data ---
  const { data: apiComplianceStatus, loading: statusLoading } = useApiQuery(
    () => compliance.getComplianceStatus(),
    [],
  );
  const { data: apiAuditLogs, loading: logsLoading } = useApiQuery(
    () => compliance.getAuditLogs(),
    [],
  );

  const isLoading = statusLoading || logsLoading;

  // Resolve compliance status from API or fallback
  const resolvedComplianceStatus = useMemo(() => {
    if (apiComplianceStatus && Array.isArray(apiComplianceStatus) && apiComplianceStatus.length > 0) {
      return apiComplianceStatus.map((s) => ({
        framework: s.framework,
        status: s.status,
        lastAudit: s.last_audit,
        findings: s.findings,
      }));
    }
    return mockComplianceStatus;
  }, [apiComplianceStatus]);

  // Resolve audit logs from API or fallback
  const resolvedAuditLogs = useMemo(() => {
    if (apiAuditLogs?.items && apiAuditLogs.items.length > 0) {
      return apiAuditLogs.items.map((log) => ({
        time: new Date(log.timestamp).toLocaleTimeString(),
        user: log.user_name,
        action: log.action,
        resource: `${log.resource} ${log.resource_id ? "#" + log.resource_id : ""}`.trim(),
      }));
    }
    return mockAuditLogs;
  }, [apiAuditLogs]);
  return (
    <MainLayout
      title={t("compliance.title")}
      subtitle={t("compliance.subtitle")}
    >
      <div className="space-y-6">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
            <span className="text-xs text-blue-400">{t("loading.compliance")}</span>
          </div>
        )}

        {/* Compliance Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {resolvedComplianceStatus.map((item) => (
            <Card key={item.framework}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {item.framework}
                  </h3>
                  <Badge
                    variant={
                      item.status === "compliant"
                        ? "success"
                        : item.status === "review-required"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {item.status === "compliant" ? t("compliance.compliant") : t("compliance.review")}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("compliance.lastAudit")}</span>
                    <span className="text-gray-300">{item.lastAudit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t("compliance.openFindingsLabel")}</span>
                    <span
                      className={
                        item.findings > 0 ? "text-amber-400" : "text-emerald-400"
                      }
                    >
                      {item.findings}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Log */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("compliance.auditLog")}</CardTitle>
              <Button variant="secondary" size="sm">
                {t("common.export")}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t("compliance.timestamp")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t("compliance.user")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t("compliance.action")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        {t("compliance.resource")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {resolvedAuditLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/50">
                        <td className="px-6 py-3 text-sm text-gray-400">
                          {log.time}
                        </td>
                        <td className="px-6 py-3 text-sm text-white">
                          {log.user}
                        </td>
                        <td className="px-6 py-3">
                          <Badge
                            variant={
                              log.action === "create"
                                ? "success"
                                : log.action === "update"
                                  ? "warning"
                                  : log.action === "delete"
                                    ? "danger"
                                    : "info"
                            }
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-300">
                          {log.resource}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Data Governance */}
          <Card>
            <CardHeader>
              <CardTitle>{t("compliance.dataGovernance")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldIcon className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-white">
                    {t("compliance.dataEncryption")}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {t("compliance.encryptionDesc")}
                </p>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <ClockIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    {t("compliance.retentionPolicy")}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {t("compliance.retentionDesc")}
                </p>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <UserIcon className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-medium text-white">
                    {t("compliance.accessControl")}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {t("compliance.accessControlDesc")}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <h4 className="text-sm font-medium text-white mb-3">
                  {t("compliance.quickActions")}
                </h4>
                <div className="space-y-2">
                  <Button variant="secondary" size="sm" className="w-full">
                    {t("compliance.requestDataExport")}
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full">
                    {t("compliance.viewPrivacyPolicy")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
