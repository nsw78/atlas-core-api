"use client";

import { useState } from "react";
import { useUIStore, usePlatformStore } from "@/store";
import { StatusBadge, Button } from "@/components/atoms";
import { formatDate } from "@/utils";
import { LanguageSwitcher, useI18n } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { status } = usePlatformStore();
  const { notifications } = useUIStore();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.acknowledged).length;

  return (
    <header className="h-16 bg-gray-950/60 backdrop-blur-2xl border-b border-white/[0.06] sticky top-0 z-40">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="h-full px-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Platform Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-gray-400 font-medium">{t("common.system")}</span>
            <StatusBadge status={status} />
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="relative rounded-xl"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-gray-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 glass-elevated rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden">
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{t("dashboard.notifications.title")}</h3>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {unreadCount > 0 && (
                    <button className="text-[11px] text-blue-400 hover:text-blue-300 mt-1 font-medium">
                      {t("dashboard.notifications.markAllRead")}
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((notification) => (
                      <div key={notification.id} className={`p-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${!notification.acknowledged ? "bg-blue-500/[0.04]" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notification.acknowledged ? "bg-blue-400" : "bg-gray-600"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{formatDate(notification.timestamp, "MMM d, HH:mm")}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gray-800/50 flex items-center justify-center">
                        <BellIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-500">{t("dashboard.notifications.noNotifications")}</p>
                    </div>
                  )}
                </div>
                {notifications.length > 5 && (
                  <div className="p-3 border-t border-white/[0.06]">
                    <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                      {t("dashboard.notifications.viewAll")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <span className="text-xs text-gray-500 font-medium hidden lg:block">
            {formatDate(new Date().toISOString(), "EEE, MMM d")}
          </span>

          {/* Separator */}
          <div className="w-px h-6 bg-white/[0.06] hidden lg:block" />

          {/* User Profile */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/15">
                  {user.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="hidden md:block text-left">
                  <span className="text-sm text-white font-medium block leading-tight">{user.username || "User"}</span>
                  <span className="text-[10px] text-gray-500 capitalize">{user.roles?.[0] || "analyst"}</span>
                </div>
                <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 glass-elevated rounded-2xl shadow-2xl py-1 z-50 animate-scale-in overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-semibold text-white">{user.username || "User"}</p>
                    <p className="text-[11px] text-gray-500">{user.email || `${user.username}@atlas.local`}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors">
                      <SettingsIcon className="w-4 h-4 text-gray-500" />
                      {t("common.settings")}
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                    >
                      <LogoutIcon className="w-4 h-4" />
                      {t("common.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
