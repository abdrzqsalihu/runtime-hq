"use client";

import { Search, Bell, Terminal, Sun, Moon, Cpu, Globe } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

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
            <Globe className="w-3 h-3 text-foreground/40" />
            Nodes_Online: 24
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="EXECUTE_COMMAND..."
            className="h-8 w-48 pl-9 pr-4 bg-foreground/[0.03] border border-border rounded-sm text-[9px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground"
          />
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05] rounded-sm transition-colors cursor-pointer active:scale-95"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button className="p-2 text-foreground/60 hover:text-foreground hover:bg-foreground/[0.05] rounded-sm transition-colors relative cursor-pointer active:scale-95">
          <Bell className="w-3.5 h-3.5" />
          <div className="absolute top-2 right-2 w-1 h-1 bg-error rounded-full animate-pulse" />
        </button>
      </div>
    </header>
  );
}
