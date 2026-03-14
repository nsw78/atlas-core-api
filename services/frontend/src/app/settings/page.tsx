"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layouts";
import { useI18n, type Locale } from "@/i18n";

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-blue-600" : "bg-gray-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const settingsTabs = ["general", "appearance", "security", "integrations", "notificationsTab"] as const;
type SettingsTab = (typeof settingsTabs)[number];

export default function SettingsPage() {
  const { t, locale, setLocale, locales, localeName, localeFlag } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [darkMode, setDarkMode] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState(false);
  const [alertNotif, setAlertNotif] = useState(true);
  const [reportNotif, setReportNotif] = useState(true);
  const [systemNotif, setSystemNotif] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <MainLayout title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="space-y-6">
        {/* Save confirmation */}
        {saved && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl animate-slide-up">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-emerald-400 font-medium">{t("settings.saved")}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tab Navigation */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-2 space-y-0.5">
              {settingsTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    activeTab === tab
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <TabIcon tab={tab} active={activeTab === tab} />
                  {t(`settings.${tab}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3">
            <div className="glass-card rounded-2xl animate-fade-in">
              {/* General Tab */}
              {activeTab === "general" && (
                <div className="divide-y divide-white/[0.06]">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">{t("settings.general")}</h2>
                    <p className="text-xs text-gray-500">{t("settings.subtitle")}</p>
                  </div>
                  <SettingRow
                    title={t("settings.language")}
                    description={t("settings.languageDesc")}
                  >
                    <select
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as Locale)}
                      className="bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[180px]"
                    >
                      {locales.map((loc) => (
                        <option key={loc} value={loc}>
                          {localeFlag(loc)} {localeName(loc)}
                        </option>
                      ))}
                    </select>
                  </SettingRow>
                  <SettingRow
                    title={t("settings.timezone")}
                    description={t("settings.timezoneDesc")}
                  >
                    <select className="bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[180px]">
                      <option>UTC-3 (Brasilia)</option>
                      <option>UTC+0 (London)</option>
                      <option>UTC-5 (New York)</option>
                      <option>UTC+1 (Madrid)</option>
                      <option>UTC+8 (Singapore)</option>
                    </select>
                  </SettingRow>
                  <SettingRow
                    title={t("settings.dateFormat")}
                    description={t("settings.dateFormatDesc")}
                  >
                    <select className="bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[180px]">
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </SettingRow>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === "appearance" && (
                <div className="divide-y divide-white/[0.06]">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">{t("settings.appearance")}</h2>
                  </div>
                  <SettingRow title={t("settings.darkMode")} description={t("settings.darkModeDesc")}>
                    <Toggle enabled={darkMode} onChange={setDarkMode} />
                  </SettingRow>
                  <SettingRow title={t("settings.compactView")} description={t("settings.compactViewDesc")}>
                    <Toggle enabled={compactView} onChange={setCompactView} />
                  </SettingRow>
                  <SettingRow title={t("settings.animationsEnabled")} description={t("settings.animationsDesc")}>
                    <Toggle enabled={animations} onChange={setAnimations} />
                  </SettingRow>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="divide-y divide-white/[0.06]">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">{t("settings.security")}</h2>
                  </div>
                  <SettingRow title={t("settings.twoFactorAuth")} description={t("settings.twoFactorDesc")}>
                    <div className="flex items-center gap-3">
                      <Toggle enabled={twoFactor} onChange={setTwoFactor} />
                      <span className={`text-xs font-medium ${twoFactor ? "text-emerald-400" : "text-gray-500"}`}>
                        {twoFactor ? t("settings.enabled") : t("settings.disabled")}
                      </span>
                    </div>
                  </SettingRow>
                  <SettingRow title={t("settings.sessionTimeout")} description={t("settings.sessionTimeoutDesc")}>
                    <select className="bg-white/[0.04] border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[180px]">
                      <option>15 {t("settings.minutes")}</option>
                      <option>30 {t("settings.minutes")}</option>
                      <option>60 {t("settings.minutes")}</option>
                      <option>120 {t("settings.minutes")}</option>
                    </select>
                  </SettingRow>
                  <SettingRow title={t("settings.ipWhitelist")} description={t("settings.ipWhitelistDesc")}>
                    <div className="flex items-center gap-3">
                      <Toggle enabled={ipWhitelist} onChange={setIpWhitelist} />
                      <span className={`text-xs font-medium ${ipWhitelist ? "text-emerald-400" : "text-gray-500"}`}>
                        {ipWhitelist ? t("settings.enabled") : t("settings.disabled")}
                      </span>
                    </div>
                  </SettingRow>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === "integrations" && (
                <div className="divide-y divide-white/[0.06]">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">{t("settings.integrations")}</h2>
                  </div>
                  <IntegrationRow
                    title={t("settings.webhooks")}
                    description={t("settings.webhooksDesc")}
                    status="configured"
                    t={t}
                  />
                  <IntegrationRow
                    title={t("settings.slackIntegration")}
                    description={t("settings.slackDesc")}
                    status="not-configured"
                    t={t}
                  />
                  <IntegrationRow
                    title={t("settings.emailIntegration")}
                    description={t("settings.emailDesc")}
                    status="configured"
                    t={t}
                  />
                  <IntegrationRow
                    title={t("settings.ssoIntegration")}
                    description={t("settings.ssoDesc")}
                    status="not-configured"
                    t={t}
                  />
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notificationsTab" && (
                <div className="divide-y divide-white/[0.06]">
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">{t("settings.notificationsTab")}</h2>
                  </div>
                  <SettingRow title={t("settings.alertNotifications")} description={t("settings.alertNotifDesc")}>
                    <Toggle enabled={alertNotif} onChange={setAlertNotif} />
                  </SettingRow>
                  <SettingRow title={t("settings.reportNotifications")} description={t("settings.reportNotifDesc")}>
                    <Toggle enabled={reportNotif} onChange={setReportNotif} />
                  </SettingRow>
                  <SettingRow title={t("settings.systemNotifications")} description={t("settings.systemNotifDesc")}>
                    <Toggle enabled={systemNotif} onChange={setSystemNotif} />
                  </SettingRow>
                  <SettingRow title={t("settings.emailDigest")} description={t("settings.emailDigestDesc")}>
                    <Toggle enabled={emailDigest} onChange={setEmailDigest} />
                  </SettingRow>
                </div>
              )}

              {/* Save Button */}
              <div className="p-6 flex items-center justify-end gap-3 border-t border-white/[0.06]">
                <button className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors">
                  {t("settings.resetDefaults")}
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/20"
                >
                  {t("settings.saveChanges")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-6">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0 ml-4">{children}</div>
    </div>
  );
}

function IntegrationRow({ title, description, status, t }: { title: string; description: string; status: "configured" | "not-configured"; t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-between p-6">
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
          status === "configured"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-gray-700/50 text-gray-400 border border-white/[0.06]"
        }`}>
          {status === "configured" ? t("settings.configured") : t("settings.notConfigured")}
        </span>
        <button className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-colors">
          {t("common.settings")}
        </button>
      </div>
    </div>
  );
}

function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const color = active ? "text-blue-400" : "text-gray-500";
  const cls = `w-4 h-4 ${color}`;

  switch (tab) {
    case "general":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "appearance":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      );
    case "security":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case "integrations":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case "notificationsTab":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    default:
      return null;
  }
}
