"use client";

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layouts";
import { useI18n } from "@/i18n";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { reports as reportsApi } from "@/sdk/endpoints";
import type { CreateReportRequest } from "@/sdk/endpoints";

const reportTemplates = [
  { id: "exec-summary", icon: "📊", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20" },
  { id: "risk-report", icon: "🛡️", color: "from-red-500/20 to-orange-500/20", border: "border-red-500/20" },
  { id: "compliance-report", icon: "✅", color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/20" },
  { id: "threat-briefing", icon: "⚠️", color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/20" },
  { id: "weekly-digest", icon: "📅", color: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/20" },
  { id: "custom-report", icon: "📝", color: "from-gray-500/20 to-gray-400/20", border: "border-gray-500/20" },
];

const templateNameMap: Record<string, string> = {
  "exec-summary": "executiveSummary",
  "risk-report": "riskReport",
  "compliance-report": "complianceReport",
  "threat-briefing": "threatBriefing",
  "weekly-digest": "weeklyDigest",
  "custom-report": "customReport",
};

const recentReports = [
  { id: "RPT-001", template: "executiveSummary", date: "2026-03-12", status: "published", pages: 24, author: "System" },
  { id: "RPT-002", template: "riskReport", date: "2026-03-11", status: "published", pages: 18, author: "admin" },
  { id: "RPT-003", template: "threatBriefing", date: "2026-03-10", status: "published", pages: 12, author: "System" },
  { id: "RPT-004", template: "complianceReport", date: "2026-03-09", status: "draft", pages: 32, author: "admin" },
  { id: "RPT-005", template: "weeklyDigest", date: "2026-03-08", status: "published", pages: 8, author: "System" },
];

const scheduledReports = [
  { template: "executiveSummary", frequencyKey: "enterprise.daily", nextRun: "2026-03-14 06:00", recipients: 5 },
  { template: "weeklyDigest", frequencyKey: "enterprise.weekly", nextRun: "2026-03-17 09:00", recipients: 12 },
  { template: "complianceReport", frequencyKey: "enterprise.monthly", nextRun: "2026-04-01 08:00", recipients: 3 },
];

export default function ReportsPage() {
  const { t } = useI18n();
  const [selectedTab, setSelectedTab] = useState<"templates" | "recent" | "scheduled">("templates");

  // --- API calls with fallback to mock data ---
  const { data: apiReports, loading: reportsLoading } = useApiQuery(
    () => reportsApi.listReports(),
    [],
  );
  const { data: apiTemplates, loading: templatesLoading } = useApiQuery(
    () => reportsApi.getTemplates(),
    [],
  );
  const { mutate: createReportApi, loading: createLoading } = useApiMutation(
    (params: CreateReportRequest) => reportsApi.createReport(params),
  );

  const isLoading = reportsLoading || templatesLoading;

  // Resolve recent reports from API or fallback
  const resolvedRecentReports = useMemo(() => {
    if (apiReports?.items && apiReports.items.length > 0) {
      return apiReports.items.map((r) => ({
        id: r.id,
        template: r.type || "executiveSummary",
        date: r.created_at?.split("T")[0] ?? "",
        status: r.status === "ready" ? "published" : r.status === "generating" ? "draft" : r.status,
        pages: 0,
        author: r.created_by,
      }));
    }
    return recentReports;
  }, [apiReports]);

  // Resolve templates from API or fallback
  const resolvedTemplates = useMemo(() => {
    if (apiTemplates && Array.isArray(apiTemplates) && apiTemplates.length > 0) {
      const defaultColors = [
        { color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/20", icon: "📊" },
        { color: "from-red-500/20 to-orange-500/20", border: "border-red-500/20", icon: "🛡️" },
        { color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/20", icon: "✅" },
        { color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/20", icon: "⚠️" },
        { color: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/20", icon: "📅" },
        { color: "from-gray-500/20 to-gray-400/20", border: "border-gray-500/20", icon: "📝" },
      ];
      return apiTemplates.map((tmpl, i) => ({
        id: tmpl.id,
        icon: defaultColors[i % defaultColors.length]?.icon ?? "📊",
        color: defaultColors[i % defaultColors.length]?.color ?? "from-blue-500/20 to-cyan-500/20",
        border: defaultColors[i % defaultColors.length]?.border ?? "border-blue-500/20",
        name: tmpl.name,
        description: tmpl.description,
        formats: tmpl.formats,
      }));
    }
    return reportTemplates;
  }, [apiTemplates]);

  // Generate report via API
  const handleGenerateReport = (templateId: string) => {
    createReportApi({
      name: `Report - ${new Date().toLocaleDateString()}`,
      template_id: templateId,
      format: "pdf",
    }).catch(() => {
      // API unavailable - silently fail
    });
  };

  const kpis = [
    { label: t("reports.totalReports"), value: "247", color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: t("reports.thisMonth"), value: "18", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: t("reports.automated"), value: "3", color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: t("reports.pending"), value: "2", color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const tabs = [
    { key: "templates" as const, label: t("reports.templates") },
    { key: "recent" as const, label: t("reports.recentReports") },
    { key: "scheduled" as const, label: t("reports.scheduledReports") },
  ];

  return (
    <MainLayout title={t("reports.title")} subtitle={t("reports.subtitle")}>
      <div className="space-y-6">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
            <span className="text-xs text-blue-400">Loading reports data...</span>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, index) => (
            <div
              key={kpi.label}
              className="glass-card rounded-2xl p-5 animate-slide-up"
              style={{ animationDelay: `${index * 75}ms`, animationFillMode: "backwards" }}
            >
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                <svg className={`w-5 h-5 ${kpi.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedTab === tab.key
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {selectedTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {resolvedTemplates.map((tmpl, index) => (
              <div
                key={tmpl.id}
                className={`glass-card rounded-2xl p-6 border ${tmpl.border} hover:-translate-y-1 transition-all duration-300 cursor-pointer group animate-slide-up`}
                style={{ animationDelay: `${index * 75}ms`, animationFillMode: "backwards" }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tmpl.color} flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition-transform`}>
                  {tmpl.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-1">
                  {t(`reports.${templateNameMap[tmpl.id]}`)}
                </h3>
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                  {t("reports.subtitle")}
                </p>
                <button
                  onClick={() => handleGenerateReport(tmpl.id)}
                  disabled={createLoading}
                  className="w-full px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors font-medium disabled:opacity-50"
                >
                  {createLoading ? "Generating..." : t("reports.generateReport")}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recent Reports */}
        {selectedTab === "recent" && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">{t("reports.recentReports")}</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {resolvedRecentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t(`reports.${report.template}`)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-500">{report.id}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[11px] text-gray-500">{report.pages} {t("reports.pages")}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[11px] text-gray-500">{report.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                      report.status === "published"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {t(`reports.${report.status}`)}
                    </span>
                    <button className="px-3 py-1.5 text-xs bg-white/[0.04] text-gray-300 border border-white/[0.08] rounded-xl hover:bg-white/[0.08] transition-colors">
                      {t("reports.download")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Reports */}
        {selectedTab === "scheduled" && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">{t("reports.scheduledReports")}</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {scheduledReports.map((report, i) => (
                <div key={i} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t(`reports.${report.template}`)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-500">{t(report.frequencyKey)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span className="text-[11px] text-gray-500">{report.recipients} {t("reports.recipients")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{t("common.next")}</p>
                    <p className="text-sm text-white font-medium tabular-nums">{report.nextRun}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
