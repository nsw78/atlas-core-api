"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layouts";
import { useI18n } from "@/i18n";

const threatFeeds = [
  { id: "tf-001", name: "MITRE ATT&CK", status: "active", iocs: 12847, lastUpdate: "2 min" },
  { id: "tf-002", name: "AlienVault OTX", status: "active", iocs: 8432, lastUpdate: "5 min" },
  { id: "tf-003", name: "VirusTotal", status: "active", iocs: 23891, lastUpdate: "1 min" },
  { id: "tf-004", name: "Abuse.ch", status: "active", iocs: 6721, lastUpdate: "8 min" },
  { id: "tf-005", name: "Shodan", status: "degraded", iocs: 4219, lastUpdate: "15 min" },
  { id: "tf-006", name: "Censys", status: "active", iocs: 3872, lastUpdate: "3 min" },
];

const threatActors = [
  { name: "APT28", alias: "Fancy Bear", origin: "Russia", campaigns: 47, severity: "critical", lastSeen: "2h", ttps: ["T1566", "T1059", "T1071"] },
  { name: "APT41", alias: "Winnti", origin: "China", campaigns: 32, severity: "high", lastSeen: "6h", ttps: ["T1190", "T1078", "T1055"] },
  { name: "Lazarus", alias: "Hidden Cobra", origin: "North Korea", campaigns: 28, severity: "critical", lastSeen: "1d", ttps: ["T1566", "T1204", "T1027"] },
  { name: "APT29", alias: "Cozy Bear", origin: "Russia", campaigns: 38, severity: "high", lastSeen: "4h", ttps: ["T1195", "T1053", "T1102"] },
  { name: "FIN7", alias: "Carbanak", origin: "Russia", campaigns: 21, severity: "medium", lastSeen: "3d", ttps: ["T1566", "T1059", "T1074"] },
];

const recentIOCs = [
  { indicator: "185.220.101.***", type: "IP", confidence: 95, source: "AlienVault", severity: "critical" },
  { indicator: "evil-domain.***", type: "Domain", confidence: 87, source: "VirusTotal", severity: "high" },
  { indicator: "a3f2b8c1d4e5...", type: "Hash (SHA256)", confidence: 92, source: "Abuse.ch", severity: "critical" },
  { indicator: "phishing@fake...", type: "Email", confidence: 78, source: "MITRE", severity: "medium" },
  { indicator: "203.0.113.***", type: "IP", confidence: 83, source: "Shodan", severity: "high" },
  { indicator: "malware-cdn.***", type: "URL", confidence: 91, source: "VirusTotal", severity: "critical" },
];

export default function ThreatsPage() {
  const { t } = useI18n();
  const [selectedTab, setSelectedTab] = useState<"feeds" | "actors" | "iocs">("feeds");

  const kpis = [
    { label: t("threats.activeThreatFeeds"), value: "6", color: "text-emerald-400", bg: "bg-emerald-500/10", trend: "+2" },
    { label: t("threats.iocCount"), value: "59,982", color: "text-blue-400", bg: "bg-blue-500/10", trend: "+1,247" },
    { label: t("threats.threatActors"), value: "142", color: "text-amber-400", bg: "bg-amber-500/10", trend: "+8" },
    { label: t("threats.campaigns"), value: "23", color: "text-red-400", bg: "bg-red-500/10", trend: "+3" },
  ];

  const tabs = [
    { key: "feeds" as const, label: t("threats.activeThreatFeeds") },
    { key: "actors" as const, label: t("threats.threatActors") },
    { key: "iocs" as const, label: t("threats.indicators") },
  ];

  return (
    <MainLayout title={t("threats.title")} subtitle={t("threats.subtitle")}>
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi, index) => (
            <div
              key={kpi.label}
              className="glass-card rounded-2xl p-5 animate-slide-up"
              style={{ animationDelay: `${index * 75}ms`, animationFillMode: "backwards" }}
            >
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                <span className={`text-lg font-bold ${kpi.color}`}>#</span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">{kpi.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-white tracking-tight">{kpi.value}</p>
                <span className="text-[11px] text-emerald-400 font-medium">{kpi.trend}</span>
              </div>
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

        {/* Tab Content */}
        {selectedTab === "feeds" && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">{t("threats.activeThreatFeeds")}</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {threatFeeds.map((feed) => (
                <div key={feed.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${feed.status === "active" ? "bg-emerald-500 ring-4 ring-emerald-500/10" : "bg-amber-500 ring-4 ring-amber-500/10"}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{feed.name}</p>
                      <p className="text-[11px] text-gray-500">{t("threats.lastSeen")}: {feed.lastUpdate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white tabular-nums">{feed.iocs.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">IOCs</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                      feed.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {feed.status === "active" ? t("platform.healthy") : t("platform.degraded")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "actors" && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-white/[0.06]">
              <h2 className="text-lg font-semibold text-white">{t("threats.threatActors")}</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {threatActors.map((actor) => (
                <div key={actor.name} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-white">{actor.name}</h3>
                        <span className="text-[11px] text-gray-500">({actor.alias})</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          actor.severity === "critical" ? "bg-red-500/15 text-red-400" :
                          actor.severity === "high" ? "bg-orange-500/15 text-orange-400" :
                          "bg-amber-500/15 text-amber-400"
                        }`}>
                          {t(`risk.${actor.severity}`)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{t("threats.attribution")}: {actor.origin}</span>
                        <span>{t("threats.campaigns")}: {actor.campaigns}</span>
                        <span>{t("threats.lastSeen")}: {actor.lastSeen}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {actor.ttps.map((ttp) => (
                          <span key={ttp} className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-md text-[10px] text-violet-400 font-mono">
                            {ttp}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors">
                      {t("threats.investigate")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "iocs" && (
          <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{t("threats.indicators")}</h2>
                <button className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors">
                  {t("threats.exportIOCs")}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Indicator</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("common.type")}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("threats.confidence")}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("threats.source")}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("threats.severity")}</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {recentIOCs.map((ioc, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm text-white font-mono">{ioc.indicator}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">{ioc.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${ioc.confidence >= 90 ? "bg-emerald-500" : ioc.confidence >= 80 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${ioc.confidence}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums">{ioc.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{ioc.source}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          ioc.severity === "critical" ? "bg-red-500/15 text-red-400" :
                          ioc.severity === "high" ? "bg-orange-500/15 text-orange-400" :
                          "bg-amber-500/15 text-amber-400"
                        }`}>
                          {t(`risk.${ioc.severity}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                          {t("threats.blocklist")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
