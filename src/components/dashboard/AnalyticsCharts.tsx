"use client";

import { Activity, Zap, BarChart3 } from "lucide-react";
import { cn, createSeededRng } from "@/lib/utils";

const services = [
  { name: "PAYMENT_GATEWAY", region: "US_EAST", uptime: 99.99 },
  { name: "AUTH_SERVICE", region: "EU_WEST", uptime: 99.95 },
  { name: "EDGE_CDN", region: "GLOBAL", uptime: 100 },
  { name: "STORAGE_NODE", region: "US_WEST", uptime: 98.2 },
  { name: "API_MESH", region: "AP_SOUTH", uptime: 99.8 },
];

type HeartbeatState = "ok" | "degraded" | "error";

function generateHeartbeats(seedKey: string, count: number): HeartbeatState[] {
  const rand = createSeededRng(seedKey);
  return Array.from({ length: count }, () => {
    if (rand() <= 0.05) return "error";
    return rand() <= 0.1 ? "degraded" : "ok";
  });
}

function HeartbeatStrip({ data }: { data: HeartbeatState[] }) {
  return (
    <div className="flex gap-[2px] h-6 cursor-pointer">
      {data.map((state, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-[1px] transition-all hover:scale-y-125 hover:z-10",
            state === "ok" ? "bg-success/30 hover:bg-success" :
              state === "degraded" ? "bg-warning/30 hover:bg-warning" : "bg-error/30 hover:bg-error"
          )}
        />
      ))}
    </div>
  );
}

export function AnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-b border-border">
      {/* System Pulse Strip */}
      <div className="lg:col-span-2 p-6 border-r border-border bg-foreground/[0.01]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Heartbeat_Cluster_Signals</h3>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-bold text-foreground/40 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success/60" /> OK</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning/60" /> DEGRADED</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-error/60" /> ERROR</div>
          </div>
        </div>

        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.name} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-foreground/70 group-hover:text-accent transition-colors cursor-pointer">{service.name}</span>
                  <span className="text-[8px] font-bold text-foreground/40 uppercase tracking-tighter">{service.region}</span>
                </div>
                <span className="text-[9px] font-black text-foreground/60 tabular-nums">{service.uptime}%</span>
              </div>
              <HeartbeatStrip data={generateHeartbeats(`${service.name}:${service.region}`, 60)} />
            </div>
          ))}
        </div>
      </div>

      {/* Event Density / Load Distribution */}
      <div className="p-6 bg-foreground/[0.02]">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="w-4 h-4 text-accent" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Resource_Allocation</h3>
        </div>

        <div className="space-y-6">
          {[
            { label: "MEMORY_USAGE", val: 72, color: "var(--color-accent)" },
            { label: "DISK_IO", val: 34, color: "var(--color-success)" },
            { label: "NETWORK_THROUGHPUT", val: 88, color: "var(--color-warning)" },
            { label: "REQUEST_QUEUES", val: 12, color: "var(--color-error)" },
          ].map((item) => (
            <div key={item.label} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest group-hover:text-foreground transition-colors">{item.label}</span>
                <span className="text-[10px] font-black text-foreground/70 tabular-nums">{item.val}%</span>
              </div>
              <div className="h-1.5 bg-foreground/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out group-hover:opacity-100"
                  style={{
                    width: `${item.val}%`,
                    backgroundColor: item.color,
                    opacity: 0.8
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2 text-warning/80">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-widest">Anomaly Detection</span>
          </div>
          <p className="text-[8px] font-bold text-muted uppercase tracking-[0.15em] mt-2 leading-relaxed">
            No critical deviations found in current sync cycle.
          </p>
        </div>
      </div>
    </div>
  );
}
