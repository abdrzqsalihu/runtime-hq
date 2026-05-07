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
    <div className="flex gap-[2px] h-6">
      {data.map((state, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-[1px] transition-colors",
            state === "ok" ? "bg-success/20 hover:bg-success" :
              state === "degraded" ? "bg-warning/20 hover:bg-warning" : "bg-error/20 hover:bg-error"
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
      <div className="lg:col-span-2 p-6 border-r border-border bg-foreground/[0.005]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Heartbeat_Cluster_Signals</h3>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success/20" /> OK</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning/20" /> DEGRADED</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-error/20" /> ERROR</div>
          </div>
        </div>

        <div className="space-y-4">
          {services.map((service) => (
            <div key={service.name} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-foreground/60 group-hover:text-accent transition-colors">{service.name}</span>
                  <span className="text-[8px] font-bold text-foreground/20 uppercase tracking-tighter">{service.region}</span>
                </div>
                <span className="text-[9px] font-black text-foreground/30 tabular-nums">{service.uptime}%</span>
              </div>
              <HeartbeatStrip data={generateHeartbeats(`${service.name}:${service.region}`, 60)} />
            </div>
          ))}
        </div>
      </div>

      {/* Event Density / Load Distribution */}
      <div className="p-6 bg-foreground/[0.01]">
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
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest">{item.label}</span>
                <span className="text-[10px] font-black text-foreground/60 tabular-nums">{item.val}%</span>
              </div>
              <div className="h-1 bg-foreground/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${item.val}%`,
                    backgroundColor: item.color,
                    opacity: 0.6
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 border border-border bg-background rounded-sm flex items-center gap-4">
          <Zap className="w-4 h-4 text-warning" />
          <div>
            <div className="text-[9px] font-black text-foreground/60 uppercase tracking-widest">Anomaly Detection</div>
            <div className="text-[8px] font-bold text-foreground/20 uppercase mt-0.5">No critical deviations found in current sync cycle.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
