"use client";

import { Search, Bell, Terminal, Sun, Moon, Cpu, Globe } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { usePathname } from "next/navigation";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const getPageTitle = () => {
    const path = pathname.split("/")[1];
    if (!path) return "DASHBOARD_CORE";
    return path.toUpperCase() + "_SUBSYSTEM";
  };

  return (
    <header className="h-14 border-b border-border bg-background sticky top-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <h1 className="text-[10px] font-black tracking-[0.2em] text-foreground/80">
            {getPageTitle()}
          </h1>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-4 text-[9px] font-bold text-foreground/30 uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            KERNEL_LIVE
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            CPU_LOAD: 12%
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            NODES: 24/24
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/20 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="EXECUTE_COMMAND..."
            className="pl-8 pr-4 py-1.5 bg-foreground/[0.02] border border-border rounded-sm text-[9px] font-bold tracking-widest w-48 focus:outline-none focus:border-accent/40 placeholder:text-foreground/10 uppercase"
          />
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <button
          onClick={toggleTheme}
          className="p-1.5 text-foreground/30 hover:text-accent transition-colors"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button className="relative p-1.5 text-foreground/30 hover:text-accent transition-colors">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1 h-1 bg-error rounded-full" />
        </button>

        <button className="ml-2 px-3 py-1.5 bg-accent text-black rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all">
          DEPLOY_RESOURCE
        </button>
      </div>
    </header>
  );
}
