"use client";

import { Activity, Server, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPI {
  totalUptimePercent: number;
  activeServices: number;
  avgResponseTimeMs: number | null;
  activeIncidents: number;
}

interface KPICardsProps {
  kpi: KPI | null;
  loading: boolean;
}

export function KPICards({ kpi, loading }: KPICardsProps) {
  const metrics = [
    {
      label: "SYSTEM_UPTIME",
      value: kpi ? `${kpi.totalUptimePercent.toFixed(2)}%` : "—",
      status: kpi ? (kpi.totalUptimePercent >= 99 ? "success" : kpi.totalUptimePercent >= 95 ? "warning" : "error") : "warning",
      icon: Activity,
      description: "Global Availability",
    },
    {
      label: "NODES_ACTIVE",
      value: kpi ? String(kpi.activeServices) : "—",
      status: kpi && kpi.activeServices > 0 ? "success" : "warning",
      icon: Server,
      description: "Monitored Services",
    },
    {
      label: "LATENCY_AVG",
      value: kpi ? (kpi.avgResponseTimeMs ? `${kpi.avgResponseTimeMs}ms` : "—") : "—",
      status: kpi
        ? kpi.avgResponseTimeMs
          ? kpi.avgResponseTimeMs < 200
            ? "success"
            : kpi.avgResponseTimeMs < 500
              ? "warning"
              : "error"
          : "warning"
        : "warning",
      icon: Clock,
      description: "Average Response Time",
    },
    {
      label: "ACTIVE_INCIDENTS",
      value: kpi ? String(kpi.activeIncidents).padStart(2, "0") : "—",
      status: kpi ? (kpi.activeIncidents === 0 ? "success" : kpi.activeIncidents <= 2 ? "warning" : "error") : "warning",
      icon: AlertTriangle,
      description: "Requiring Attention",
    },
  ];

  return (
    <div className="flex border-b border-border bg-foreground/[0.01]">
      {metrics.map((metric, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 p-5 border-r border-border transition-all cursor-pointer relative overflow-hidden active:bg-foreground/[0.04] group",
            "hover:bg-foreground/[0.02]",
            i === metrics.length - 1 && "border-r-0",
            loading && "opacity-60"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  metric.status === "success"
                    ? "bg-success"
                    : metric.status === "warning"
                      ? "bg-warning"
                      : "bg-error"
                )}
              />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground/70 transition-colors">
                {metric.label}
              </span>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xl font-black text-foreground/90 tracking-tighter tabular-nums">
                {loading ? "..." : metric.value}
              </p>
              <p className="text-[8px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">
                {metric.description}
              </p>
            </div>
            <metric.icon className="w-3.5 h-3.5 text-foreground/10 group-hover:text-accent/30 transition-colors mb-1" />
          </div>

          {/* Background scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-accent/50 animate-[scan_2s_linear_infinite]" />
          </div>
        </div>
      ))}
    </div>
  );
}
