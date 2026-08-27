"use client";

import { Terminal, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [activeServices, setActiveServices] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, dashboardRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/dashboard"),
        ]);

        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setActiveServices(data.services?.length || 0);
        }

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setActiveIncidents(data.kpi?.activeIncidents || 0);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
  }, []);

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "DASHBOARD_CORE";
    return parts.join(" // ").toUpperCase();
  };

  return (
    <header className="h-14 border-b border-border bg-background sticky top-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <h1 className="text-[10px] font-black tracking-[0.2em] text-foreground/90">
            {getBreadcrumbs()}
          </h1>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-4 text-[9px] font-bold text-foreground/40 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            System_Healthy
          </div>
          <div className="flex items-center gap-1.5">
            <Bell className="w-3 h-3" />
            Active_Services: {activeServices}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push("/incidents")}
          className="p-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-sm transition-colors relative cursor-pointer active:scale-95"
          title={activeIncidents > 0 ? `${activeIncidents} active incident${activeIncidents !== 1 ? 's' : ''}` : "No active incidents"}
        >
          <Bell className="w-3.5 h-3.5" />
          {activeIncidents > 0 && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-error rounded-full animate-pulse" />
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-sm transition-colors cursor-pointer active:scale-95"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
