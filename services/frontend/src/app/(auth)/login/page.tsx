"use client";

import { useState } from "react";
import { Button } from "@/components/atoms";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(username, password);
    if (!result.success) {
      setError(result.error || t("auth.invalidCredentials"));
    }
    setIsLoading(false);
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");
    const result = await login("admin", "Admin@2024");
    if (!result.success) {
      setError(result.error || t("auth.invalidCredentials"));
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh-gradient" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute inset-0 dot-pattern opacity-30" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 blur-xl opacity-40 animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blue-500/25">
              <span className="text-white font-bold text-3xl tracking-tight">A</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ATLAS</h1>
          <p className="text-sm text-gray-500 mt-1.5 font-medium tracking-wide">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-elevated rounded-3xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-7">
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {t("auth.welcomeBack")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("auth.secureAccess")}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-slide-up">
                <p className="text-sm text-red-400 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin@2024"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all"
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                isLoading={isLoading}
                className="w-full py-3 text-base font-semibold"
              >
                {isLoading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>

            <div className="mt-5">
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-gray-900/80 text-gray-600 font-medium">{t("auth.or")}</span>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handleDemoLogin}
                isLoading={isLoading}
                className="w-full py-2.5"
              >
                {t("auth.demoAccess")} ({t("auth.demoCredentials")})
              </Button>
            </div>

            <div className="mt-7 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-start gap-3">
                <LockIcon className="w-4 h-4 text-blue-400/60 mt-0.5 shrink-0" />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {t("auth.securityNotice")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-6 font-medium">
          {t("auth.complianceNotice")}
        </p>
      </div>
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
