"use client";

import { type ReactNode } from "react";
import { Sidebar, Header } from "@/components/organisms";
import { useUIStore } from "@/store";
import { cn } from "@/utils";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-950 bg-mesh-gradient">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-300 ease-out",
          sidebarOpen ? "ml-64" : "ml-0"
        )}
      >
        <Header title={title} subtitle={subtitle} />
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
