"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent } from "@/components/atoms";
import { useAuthStore } from "@/store";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);

    // Simulate login - replace with actual OAuth flow
    setTimeout(() => {
      setUser({
        id: "1",
        email: "analyst@atlas.gov",
        name: "John Analyst",
        role: "analyst",
        permissions: ["read", "create", "simulate"],
        organization: "Strategic Intelligence Division",
        lastLogin: new Date().toISOString(),
        createdAt: "2024-01-01T00:00:00Z",
      });

      router.push("/dashboard");
    }, 1000);
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
            Strategic Intelligence Platform
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-white">
                Secure Access
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Authenticate with your government credentials
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                isLoading={isLoading}
                className="w-full"
              >
                Sign in with SSO
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handleLogin}
                isLoading={isLoading}
                className="w-full"
              >
                Demo Access (Development)
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
