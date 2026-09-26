"use client";

import { Activity, BarChart3, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// The dashboard is an overview: the signals list shows this many services; /services has the full registry.
const MAX_SIGNAL_SERVICES = 6;

interface Service {
  id: string;
  name: string;
  region: string;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  lastLatencyMs: number | null;
  uptime24h: number | null;
  checks: Array<{
    id: string;
    checkedAt: string;
    status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
    latencyMs: number | null;
  }>;
}

interface AnalyticsChartsProps {
  services: Service[];
  loading: boolean;
}

type HeartbeatState = "ok" | "degraded" | "error" | "empty";

function HeartbeatStrip({ data, label }: { data: HeartbeatState[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex gap-[2px] h-6 cursor-pointer">
      {data.map((state, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-[1px] transition-all hover:scale-y-125 hover:z-10",
            state === "ok"
              ? "bg-success/30 hover:bg-success"
              : state === "degraded"
                ? "bg-warning/30 hover:bg-warning"
                : state === "error"
                  ? "bg-error/30 hover:bg-error"
                  : "bg-foreground/10"
          )}
        />
      ))}
    </div>
  );
}

export function AnalyticsCharts({ services, loading }: AnalyticsChartsProps) {
  const getHeartbeatStates = (checks: Service["checks"]): HeartbeatState[] => {
    const states: HeartbeatState[] = [...checks]
      .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
      .slice(-30)
      .map((check) => {
        if (check.status === "OUTAGE") return "error";
        if (check.status === "DEGRADED") return "degraded";
        return "ok";
      });

    // Pad with 'empty' (no observation yet) if we have fewer than 30 checks
    while (states.length < 30) {
      states.unshift("empty");
    }

    return states;
  };

  // Never-checked services have no verified status, so they're classified
  // separately rather than folded into OPERATIONAL by their default DB value.
  const checkedServices = services.filter((s) => s.checks.length > 0);
  const uncheckedCount = services.length - checkedServices.length;

  const statusCounts = checkedServices.reduce(
    (acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const total = services.length || 1;
  const operationalPercent = ((statusCounts.OPERATIONAL || 0) / total) * 100;
  const degradedPercent = ((statusCounts.DEGRADED || 0) / total) * 100;
  const outagePercent = ((statusCounts.OUTAGE || 0) / total) * 100;
  const awaitingPercent = (uncheckedCount / total) * 100;

  const statusDistribution = [
    { label: "OPERATIONAL_SERVICES", val: Math.round(operationalPercent), color: "var(--color-success)" },
    { label: "DEGRADED_SERVICES", val: Math.round(degradedPercent), color: "var(--color-warning)" },
    { label: "OUTAGE_SERVICES", val: Math.round(outagePercent), color: "var(--color-error)" },
    { label: "AWAITING_CHECK_SERVICES", val: Math.round(awaitingPercent), color: "var(--color-foreground)" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-border">
      {/* Service Heartbeats */}
      <div className="lg:col-span-2 p-4 sm:p-6 lg:border-r border-b lg:border-b-0 border-border bg-foreground/[0.01]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Service_Health_Signals</h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-bold text-foreground/40 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success/60" /> OK
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warning/60" /> DEGRADED
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-error/60" /> ERROR
            </div>
            {services.length > MAX_SIGNAL_SERVICES && (
              <Link
                href="/services"
                className="pl-4 border-l border-border font-black text-foreground/60 hover:text-accent transition-colors whitespace-nowrap"
              >
                View all services →
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-foreground/40">
            <p className="text-[9px] uppercase tracking-widest">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <AlertCircle className="w-4 h-4 text-warning" />
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">No services monitored yet</p>
            <p className="text-[8px] text-foreground/30">Add your first service to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {services.slice(0, MAX_SIGNAL_SERVICES).map((service) => {
              const uptime = service.uptime24h;
              return (
                <div key={service.id} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-foreground/70 group-hover:text-accent transition-colors cursor-pointer">
                        {service.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-foreground/60 tabular-nums">
                      {uptime !== null ? `${uptime.toFixed(1)}% · 24H` : "—"}
                    </span>
                  </div>
                  <HeartbeatStrip
                    data={getHeartbeatStates(service.checks)}
                    label={`${service.name}: last ${Math.min(service.checks.length, 30)} checks, oldest to newest${service.checks.length === 0 ? ", none recorded yet" : ""}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Service Status Distribution */}
      <div className="p-4 sm:p-6 bg-foreground/[0.02]">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-4 h-4 text-accent" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Service_Health_Distribution</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-foreground/40">
            <p className="text-[9px] uppercase tracking-widest">Loading...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">No data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {statusDistribution.map((item) => (
              <div key={item.label} className="group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest group-hover:text-foreground transition-colors">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-black text-foreground/70 tabular-nums">{item.val}%</span>
                </div>
                <div className="h-1.5 bg-foreground/[0.05] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 ease-out group-hover:opacity-100"
                    style={{
                      width: `${item.val}%`,
                      backgroundColor: item.color,
                      opacity: 0.8,
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Total Services Count */}
            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-foreground/60">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-[9px] font-black uppercase tracking-widest">Monitoring Status</span>
              </div>
              <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-[0.15em] mt-3 leading-relaxed">
                <span className="text-foreground/90">{total}</span> service{total !== 1 ? "s" : ""} monitored
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
