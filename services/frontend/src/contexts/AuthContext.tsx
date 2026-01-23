"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "atlas-auth";
const PUBLIC_PATHS = ["/login", "/forgot-password"];

// Mock user for demo (admin/admin)
const MOCK_USERS = [
  {
    id: "1",
    email: "admin",
    password: "admin",
    name: "Administrator",
    role: "admin",
    avatar: undefined,
  },
  {
    id: "2",
    email: "admin@atlas.com",
    password: "admin",
    name: "Admin User",
    role: "admin",
    avatar: undefined,
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.user && parsed.expiresAt > Date.now()) {
            setUser(parsed.user);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    const isPublicPath = PUBLIC_PATHS.some((path) => pathname?.startsWith(path));

    if (!user && !isPublicPath) {
      router.push("/login");
    } else if (user && pathname === "/login") {
      router.push("/dashboard");
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const foundUser = MOCK_USERS.find(
        (u) => (u.email === email || u.email === email.toLowerCase()) && u.password === password
      );

      if (foundUser) {
        const userData: User = {
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          role: foundUser.role,
          avatar: foundUser.avatar,
        };

        // Store session (24 hours)
        const session = {
          user: userData,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

        setUser(userData);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: "Invalid email or password" };
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    router.push("/login");
  }, [router]);

  // Show nothing while checking auth on protected pages
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
