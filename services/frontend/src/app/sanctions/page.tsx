"use client";

import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layouts";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/atoms";
import { useI18n } from "@/i18n";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { sanctions } from "@/sdk/endpoints";
import type { SanctionsScreenRequest } from "@/sdk/endpoints";

// ============================================
// MOCK DATA
// ============================================
const sanctionedCountries = [
  { flag: "\u{1F1EE}\u{1F1F7}", name: "Iran", program: "Iran Sanctions", risk: "critical", since: "1979-11-14" },
  { flag: "\u{1F1F0}\u{1F1F5}", name: "North Korea", program: "DPRK Sanctions", risk: "critical", since: "2008-06-26" },
  { flag: "\u{1F1F8}\u{1F1FE}", name: "Syria", program: "Syria Sanctions", risk: "critical", since: "2004-05-11" },
  { flag: "\u{1F1E8}\u{1F1FA}", name: "Cuba", program: "Cuba Sanctions", risk: "critical", since: "1962-02-07" },
  { flag: "\u{1F1F7}\u{1F1FA}", name: "Russia", program: "Russia/Ukraine Sanctions", risk: "critical", since: "2014-03-06" },
  { flag: "\u{1F1E7}\u{1F1FE}", name: "Belarus", program: "Belarus Sanctions", risk: "high", since: "2006-06-19" },
  { flag: "\u{1F1FB}\u{1F1EA}", name: "Venezuela", program: "Venezuela Sanctions", risk: "high", since: "2015-03-08" },
  { flag: "\u{1F1F2}\u{1F1F2}", name: "Myanmar", program: "Burma Sanctions", risk: "high", since: "1997-05-20" },
  { flag: "\u{1F1FF}\u{1F1FC}", name: "Zimbabwe", program: "Zimbabwe Sanctions", risk: "high", since: "2003-03-07" },
  { flag: "\u{1F1F1}\u{1F1E7}", name: "Lebanon", program: "Lebanon Sanctions", risk: "high", since: "2007-08-01" },
  { flag: "\u{1F1F1}\u{1F1FE}", name: "Libya", program: "Libya Sanctions", risk: "high", since: "2011-02-25" },
  { flag: "\u{1F1F8}\u{1F1F4}", name: "Somalia", program: "Somalia Sanctions", risk: "high", since: "2010-04-13" },
  { flag: "\u{1F1F8}\u{1F1E9}", name: "Sudan", program: "Sudan Sanctions", risk: "high", since: "1997-11-03" },
  { flag: "\u{1F1FE}\u{1F1EA}", name: "Yemen", program: "Yemen Sanctions", risk: "high", since: "2012-05-16" },
  { flag: "\u{1F1F3}\u{1F1EE}", name: "Nicaragua", program: "Nicaragua Sanctions", risk: "high", since: "2018-11-27" },
  { flag: "\u{1F1F7}\u{1F1F8}", name: "Serbia/Balkans", program: "Western Balkans Sanctions", risk: "medium", since: "2001-06-26" },
  { flag: "\u{1F1F8}\u{1F1F8}", name: "South Sudan", program: "South Sudan Sanctions", risk: "high", since: "2014-04-03" },
];

const dataSources = [
  { name: "OFAC SDN List", org: "US Treasury", status: "connected", lastSync: "12 min ago", records: "12,847" },
  { name: "EU Consolidated Sanctions", org: "European Union", status: "connected", lastSync: "28 min ago", records: "9,234" },
  { name: "UN Security Council Sanctions", org: "United Nations", status: "connected", lastSync: "1h ago", records: "7,156" },
  { name: "BIS Entity List", org: "US Commerce", status: "syncing", lastSync: "syncing...", records: "4,892" },
  { name: "UK OFSI Sanctions", org: "HM Treasury", status: "connected", lastSync: "45 min ago", records: "6,341" },
  { name: "World Bank Open Data", org: "World Bank", status: "connected", lastSync: "2h ago", records: "184,320" },
  { name: "UN Comtrade Database", org: "United Nations", status: "connected", lastSync: "3h ago", records: "1,247,000" },
  { name: "WTO Trade Statistics", org: "WTO", status: "syncing", lastSync: "syncing...", records: "892,450" },
  { name: "IMF Economic Data", org: "IMF", status: "connected", lastSync: "5h ago", records: "342,100" },
];

const recentScreenings = [
  { timestamp: "2026-03-10 14:32:15", entity: "Petro Sino Holdings Ltd.", type: "organization", result: "match", source: "OFAC SDN" },
  { timestamp: "2026-03-10 14:28:42", entity: "Ahmad Khalil Nazari", type: "individual", result: "review", source: "EU Sanctions" },
  { timestamp: "2026-03-10 14:15:08", entity: "MV Ocean Prosperity", type: "vessel", result: "clear", source: "UN Sanctions" },
  { timestamp: "2026-03-10 13:58:33", entity: "Damascus Steel Trading Co.", type: "organization", result: "match", source: "OFAC SDN" },
  { timestamp: "2026-03-10 13:45:21", entity: "Ilyushin IL-76 (RA-78654)", type: "aircraft", result: "review", source: "BIS Entity" },
  { timestamp: "2026-03-10 13:32:07", entity: "Global Resources FZCO", type: "organization", result: "clear", source: "UK OFSI" },
  { timestamp: "2026-03-10 13:18:44", entity: "Viktor Petrovich Sokolov", type: "individual", result: "match", source: "OFAC SDN" },
  { timestamp: "2026-03-10 12:55:19", entity: "Khartoum Industrial Group", type: "organization", result: "review", source: "UN Sanctions" },
];

const mockScreeningResults = [
  { name: "Petro Sino Holdings Ltd.", confidence: 94, sourceList: "OFAC SDN", riskLevel: "critical", matchType: "Exact Name Match" },
  { name: "Petro-Sino Holding Limited", confidence: 87, sourceList: "EU Consolidated", riskLevel: "high", matchType: "Fuzzy Match" },
  { name: "Petrochina Sinopec Holdings", confidence: 42, sourceList: "BIS Entity List", riskLevel: "low", matchType: "Partial Match" },
];

// ============================================
// SANCTIONS PAGE
// ============================================
export default function SanctionsPage() {
  const { t } = useI18n();
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("organization");
  const [countryCode, setCountryCode] = useState("");
  const [showResults, setShowResults] = useState(false);

  // --- API calls with fallback to mock data ---
  const { data: apiCountries, loading: countriesLoading } = useApiQuery(
    () => sanctions.getCountries(),
    [],
  );
  const { data: apiStats, loading: statsLoading } = useApiQuery(
    () => sanctions.getStats(),
    [],
  );
  const { mutate: screenEntityApi, data: screeningResult, loading: screeningLoading } = useApiMutation(
    (params: SanctionsScreenRequest) => sanctions.screenEntity(params),
  );

  const isLoading = countriesLoading || statsLoading;

  // Resolve countries from API or fallback
  const resolvedCountries = useMemo(() => {
    if (apiCountries && Array.isArray(apiCountries) && apiCountries.length > 0) {
      return apiCountries.map((c) => ({
        flag: c.flag_emoji || "",
        name: c.country_name,
        program: c.programs?.[0] ?? "Sanctions Program",
        risk: c.risk_level,
        since: c.active_since,
      }));
    }
    return sanctionedCountries;
  }, [apiCountries]);

  // Resolve screening results from API or fallback
  const resolvedScreeningResults = useMemo(() => {
    if (screeningResult?.matches && screeningResult.matches.length > 0) {
      return screeningResult.matches.map((m) => ({
        name: m.matched_name,
        confidence: Math.round(m.match_score * 100),
        sourceList: m.list_source,
        riskLevel: m.match_score >= 0.9 ? "critical" : m.match_score >= 0.7 ? "high" : "low",
        matchType: m.entry_type || "Match",
      }));
    }
    return mockScreeningResults;
  }, [screeningResult]);

  const handleScreen = () => {
    if (entityName.trim()) {
      // Try API screening first
      screenEntityApi({
        entity_name: entityName,
        entity_type: entityType as SanctionsScreenRequest["entity_type"],
        country_code: countryCode || undefined,
      }).catch(() => {
        // Fallback to showing mock results
      });
      setShowResults(true);
    }
  };

  // KPI data
  const kpis = [
    { label: t("sanctions.sanctionedCountries"), value: "28", trend: "+2", color: "text-amber-400", glowColor: "amber", icon: GlobeIcon },
    { label: t("sanctions.activeRestrictions"), value: "1,247", trend: "", color: "text-red-400", glowColor: "rose", icon: BanIcon },
    { label: t("sanctions.screeningsToday"), value: "3,842", trend: "+18%", color: "text-blue-400", glowColor: "blue", icon: SearchIcon },
    { label: t("sanctions.matchesFound"), value: "12", trend: "", color: "text-red-500", glowColor: "rose", icon: AlertIcon },
    { label: t("sanctions.tradeAdvisories"), value: "47", trend: "", color: "text-purple-400", glowColor: "purple", icon: FileTextIcon },
    { label: t("sanctions.dataFreshness"), value: "< 6h", trend: "", color: "text-emerald-400", glowColor: "emerald", icon: ClockIcon },
  ];

  return (
    <MainLayout
      title={t("sanctions.title")}
      subtitle={t("sanctions.subtitle")}
    >
      <div className="space-y-6">
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />
            <span className="text-xs text-blue-400">{t("loading.liveData")}</span>
          </div>
        )}

        {/* =========================================== */}
        {/* KPI Strip                                   */}
        {/* =========================================== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi, index) => (
            <div
              key={kpi.label}
              className="group relative glass-card rounded-2xl p-4 hover:-translate-y-0.5 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 75}ms`, animationFillMode: "backwards" }}
            >
              {/* Subtle top glow line */}
              <div className={`absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent ${
                kpi.glowColor === "rose" ? "via-rose-500/30" :
                kpi.glowColor === "amber" ? "via-amber-500/30" :
                kpi.glowColor === "blue" ? "via-blue-500/30" :
                kpi.glowColor === "emerald" ? "via-emerald-500/30" :
                kpi.glowColor === "purple" ? "via-purple-500/30" :
                "via-cyan-500/30"
              } to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  kpi.glowColor === "rose" ? "bg-rose-500/10" :
                  kpi.glowColor === "amber" ? "bg-amber-500/10" :
                  kpi.glowColor === "blue" ? "bg-blue-500/10" :
                  kpi.glowColor === "emerald" ? "bg-emerald-500/10" :
                  kpi.glowColor === "purple" ? "bg-purple-500/10" :
                  "bg-cyan-500/10"
                }`}>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mb-1">{kpi.label}</p>
              <p className={`text-2xl font-bold tracking-tight tabular-nums ${
                kpi.label === t("sanctions.matchesFound") ? "text-red-400" :
                kpi.label === t("sanctions.dataFreshness") ? "text-emerald-400" :
                "text-white"
              }`}>{kpi.value}</p>
              {kpi.trend && (
                <span className={`text-[11px] font-medium ${
                  kpi.label === t("sanctions.sanctionedCountries") ? "text-amber-400" : "text-blue-400"
                }`}>
                  {kpi.trend} <span className="text-gray-600">{t("sanctions.vsLastPeriod")}</span>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* =========================================== */}
        {/* Screening Panel + Sanctioned Countries      */}
        {/* =========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Entity Screening Panel */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "450ms", animationFillMode: "backwards" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <SearchIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{t("sanctions.entityScreening")}</h2>
                <p className="text-xs text-gray-400">{t("sanctions.entityScreeningDesc")}</p>
              </div>
            </div>

            {/* Screening Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-[11px] text-gray-500 font-medium mb-1.5">{t("sanctions.entityName")}</label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder={t("sanctions.entityNamePlaceholder")}
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 font-medium mb-1.5">{t("sanctions.entityType")}</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-gray-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all"
                >
                  <option value="individual">{t("sanctions.typeIndividual")}</option>
                  <option value="organization">{t("sanctions.typeOrganization")}</option>
                  <option value="vessel">{t("sanctions.typeVessel")}</option>
                  <option value="aircraft">{t("sanctions.typeAircraft")}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 font-medium mb-1.5">{t("sanctions.countryCode")}</label>
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder={t("sanctions.countryCodePlaceholder")}
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <Button variant="gradient" size="sm" onClick={handleScreen} disabled={screeningLoading}>
              <span className="flex items-center gap-2">
                {screeningLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <SearchIcon className="w-4 h-4" />
                )}
                {screeningLoading ? "Screening..." : t("sanctions.screenEntity")}
              </span>
            </Button>

            {/* Screening Results */}
            {showResults && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{t("sanctions.screeningResults")}</h3>
                  <span className="text-[11px] text-gray-500">
                    {resolvedScreeningResults.length} {t("sanctions.resultsFound")}
                  </span>
                </div>
                {resolvedScreeningResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-colors animate-slide-up"
                    style={{ animationDelay: `${idx * 80}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-white">{result.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{result.matchType}</p>
                      </div>
                      <Badge
                        variant={
                          result.riskLevel === "critical" ? "danger" :
                          result.riskLevel === "high" ? "warning" :
                          "success"
                        }
                      >
                        {result.riskLevel === "critical" ? t("sanctions.riskCritical") :
                         result.riskLevel === "high" ? t("sanctions.riskHigh") :
                         t("sanctions.riskLow")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-gray-400">
                        {t("sanctions.confidence")}:{" "}
                        <span className={`font-semibold tabular-nums ${
                          result.confidence >= 90 ? "text-red-400" :
                          result.confidence >= 70 ? "text-amber-400" :
                          "text-gray-300"
                        }`}>{result.confidence}%</span>
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                      <span className="text-gray-400">
                        {t("sanctions.sourceList")}:{" "}
                        <span className="text-gray-300 font-medium">{result.sourceList}</span>
                      </span>
                    </div>
                    {/* Confidence bar */}
                    <div className="mt-2.5 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          result.confidence >= 90 ? "bg-red-500" :
                          result.confidence >= 70 ? "bg-amber-500" :
                          "bg-emerald-500"
                        }`}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sanctioned Countries List */}
          <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "525ms", animationFillMode: "backwards" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                <GlobeIcon className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{t("sanctions.sanctionedCountriesTitle")}</h2>
                <p className="text-xs text-gray-400">{t("sanctions.sanctionedCountriesDesc")}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
              {resolvedCountries.map((country, idx) => (
                <div
                  key={country.name}
                  className="group p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{country.flag}</span>
                      <span className="text-sm font-medium text-white group-hover:text-white/90">{country.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                      country.risk === "critical"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {country.risk === "critical" ? t("sanctions.riskCritical") : t("sanctions.riskHigh")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">{country.program}</span>
                    <span className="text-[10px] text-gray-600">
                      {t("sanctions.since")} {country.since}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================== */}
        {/* Global Data Sources                         */}
        {/* =========================================== */}
        <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "600ms", animationFillMode: "backwards" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <DatabaseIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t("sanctions.globalDataSources")}</h2>
              <p className="text-xs text-gray-400">{t("sanctions.globalDataSourcesDesc")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dataSources.map((source, idx) => (
              <div
                key={source.name}
                className="group p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] hover:border-white/[0.1] transition-all animate-slide-up"
                style={{ animationDelay: `${675 + idx * 50}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{source.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{source.org}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                    source.status === "connected"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      source.status === "connected" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                    }`} />
                    {source.status === "connected" ? t("sanctions.statusConnected") : t("sanctions.statusSyncing")}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="text-[11px]">
                    <span className="text-gray-500">{t("sanctions.lastSync")}: </span>
                    <span className="text-gray-400 font-medium tabular-nums">{source.lastSync}</span>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-gray-500">{t("sanctions.records")}: </span>
                    <span className="text-white font-semibold tabular-nums">{source.records}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================== */}
        {/* Recent Screening Activity                   */}
        {/* =========================================== */}
        <div className="glass-card rounded-2xl p-6 animate-slide-up" style={{ animationDelay: "750ms", animationFillMode: "backwards" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <ListIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{t("sanctions.recentScreening")}</h2>
                <p className="text-xs text-gray-400">{t("sanctions.recentScreeningDesc")}</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              {t("sanctions.exportLog")}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {t("sanctions.timestamp")}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {t("sanctions.entityName")}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {t("sanctions.type")}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {t("sanctions.result")}
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                    {t("sanctions.source")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentScreenings.map((screening, idx) => (
                  <tr
                    key={idx}
                    className="group hover:bg-white/[0.03] transition-colors animate-slide-up"
                    style={{ animationDelay: `${825 + idx * 40}ms`, animationFillMode: "backwards" }}
                  >
                    <td className="px-4 py-3 text-sm text-gray-400 tabular-nums whitespace-nowrap">
                      {screening.timestamp}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {screening.entity}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-white/[0.06] text-gray-300 border border-white/[0.08]">
                        {screening.type === "individual" ? t("sanctions.typeIndividual") :
                         screening.type === "organization" ? t("sanctions.typeOrganization") :
                         screening.type === "vessel" ? t("sanctions.typeVessel") :
                         t("sanctions.typeAircraft")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${
                        screening.result === "match"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : screening.result === "review"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {screening.result === "match" ? t("sanctions.resultMatch") :
                         screening.result === "review" ? t("sanctions.resultReview") :
                         t("sanctions.resultClear")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {screening.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary strip */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[11px] text-gray-400">
                {t("sanctions.matches")}: <span className="text-red-400 font-semibold tabular-nums">3</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] text-gray-400">
                {t("sanctions.reviews")}: <span className="text-amber-400 font-semibold tabular-nums">3</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-gray-400">
                {t("sanctions.cleared")}: <span className="text-emerald-400 font-semibold tabular-nums">2</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// ============================================
// ICONS
// ============================================
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
