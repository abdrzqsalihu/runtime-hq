"use client";

import { Terminal, Sun, Moon, Bell, Menu } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TopBar({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [activeServices, setActiveServices] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // The dashboard endpoint returns just the two counts shown here, without loading check history.
        const dashboardRes = await fetch("/api/dashboard");
        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setActiveServices(data.kpi?.activeServices || 0);
          setActiveIncidents(data.kpi?.activeIncidents || 0);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
    // Re-run on every navigation so the TopBar doesn't keep showing data from
    // whatever page it first mounted on (it's a persistent layout element,
    // not remounted per-route by the App Router).
  }, [pathname]);

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    if (pathname === "/dashboard") return "DASHBOARD_CORE";
    return parts.join(" // ").toUpperCase();
  };

  return (
    <header className="h-14 border-b border-border bg-background sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            className="p-2 -ml-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-sm transition-colors cursor-pointer lg:hidden"
            aria-label="Open navigation"
            aria-controls="app-sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-accent shrink-0" />
          <h1 className="text-[10px] font-black tracking-[0.2em] text-foreground/90 truncate">
            {getBreadcrumbs()}
          </h1>
        </div>

        <div className="hidden md:block h-4 w-px bg-border" />

        <div className="hidden md:flex items-center gap-4 text-[9px] font-bold text-foreground/40 uppercase tracking-widest">
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

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push("/incidents")}
          className="p-2 text-foreground/60 hover:text-foreground hover:bg-foreground/5 rounded-sm transition-colors relative cursor-pointer active:scale-95"
          title={activeIncidents > 0 ? `${activeIncidents} active incident${activeIncidents !== 1 ? 's' : ''}` : "No active incidents"}
          aria-label={activeIncidents > 0 ? `${activeIncidents} active incident${activeIncidents !== 1 ? "s" : ""}, open incidents` : "No active incidents, open incidents"}
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
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
}
