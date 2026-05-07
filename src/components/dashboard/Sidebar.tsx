"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  AlertCircle,
  Bell,
  Settings,
  Globe,
  Cpu,
  Database,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Control Plane", href: "/" },
  { icon: Server, label: "Registry", href: "/services" },
  { icon: AlertCircle, label: "Events", href: "/incidents" },
  { icon: Bell, label: "Alerts", href: "/alerts" },
  { icon: Globe, label: "Public Hub", href: "/status" },
  { icon: Settings, label: "Config", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-60 border-r border-border bg-background flex flex-col h-screen sticky top-0 z-20">
      <div className="p-6 mb-2 flex items-center gap-3">
        <div className="w-6 h-6 bg-accent rounded-sm flex items-center justify-center">
          <Cpu className="w-3.5 h-3.5 text-black" />
        </div>
        <span className="text-xs font-black tracking-[0.3em] uppercase text-foreground/90">RUNTIME HQ</span>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        <div className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20">System Navigation</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all duration-75 border-l-2",
                isActive
                  ? "bg-accent/5 text-accent border-accent"
                  : "text-foreground/40 hover:text-foreground/80 hover:bg-foreground/[0.02] border-transparent"
              )}
            >
              <item.icon className={cn("w-3.5 h-3.5", isActive ? "text-accent" : "text-foreground/20")} />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-8 px-3 mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20">Active Clusters</div>
        {[
          { label: "US-EAST-PRIMARY", status: "success" },
          { label: "EU-WEST-SECONDARY", status: "success" },
          { label: "AP-SOUTH-NODE", status: "warning" },
        ].map((cluster) => (
          <div key={cluster.label} className="flex items-center justify-between px-3 py-1.5 group cursor-pointer">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-foreground/10 group-hover:text-foreground/30" />
              <span className="text-[9px] font-bold text-foreground/30 group-hover:text-foreground/60 uppercase tracking-tighter">{cluster.label}</span>
            </div>
            <div className={cn("w-1 h-1 rounded-full", cluster.status === "success" ? "bg-success" : "bg-warning")} />
          </div>
        ))}
      </nav>

      <div className="p-4 bg-foreground/[0.01] border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-6 h-6 rounded-sm bg-accent/20 flex items-center justify-center text-[9px] font-black text-accent border border-accent/20">
            SY
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-foreground/80 truncate uppercase tracking-tighter">system_root</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-2.5 h-2.5 text-success" />
              <span className="text-[8px] font-bold text-success/60 uppercase tracking-widest">Verified Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
