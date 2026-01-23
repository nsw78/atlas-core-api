"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@/components/atoms";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/i18n";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || t("auth.invalidCredentials"));
    }
    setIsLoading(false);
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");
    const result = await login("admin", "admin");
    if (!result.success) {
      setError(result.error || t("auth.invalidCredentials"));
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ATLAS</h1>
          <p className="text-sm text-gray-400 mt-1">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-white">
                {t("auth.welcomeBack")}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {t("auth.secureAccess")}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t("auth.email")}
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            </form>

            <div className="mt-4">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handleDemoLogin}
                isLoading={isLoading}
                className="w-full"
              >
                Demo Access (admin/admin)
              </Button>
            </div>

            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-start gap-3">
                <LockIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-300">
                    This system is for authorized personnel only. All access is
                    monitored and logged in compliance with security policies.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-6">
          Protected by enterprise-grade security. GDPR & LGPD compliant.
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