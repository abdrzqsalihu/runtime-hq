"use client";

import { Activity, Server, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
  {
    label: "SYSTEM_UPTIME",
    value: "99.98%",
    status: "success",
    icon: Activity,
    trend: [40, 45, 42, 48, 44, 50, 48],
  },
  {
    label: "NODES_ACTIVE",
    value: "24",
    status: "success",
    icon: Server,
    trend: [20, 22, 21, 23, 24, 24, 24],
  },
  {
    label: "LATENCY_AVG",
    value: "142ms",
    status: "warning",
    icon: Clock,
    trend: [150, 145, 160, 142, 138, 145, 142],
  },
  {
    label: "ACTIVE_EVENTS",
    value: "03",
    status: "error",
    icon: AlertTriangle,
    trend: [1, 0, 2, 1, 3, 2, 3],
  },
];

function MicroTrend({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  const width = 60;
  const height = 16;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((d - min) / range) * height,
  }));

  const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <svg width={width} height={height} className="opacity-40 group-hover:opacity-100 transition-opacity">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KPICards() {
  return (
    <div className="flex border-b border-border bg-foreground/[0.01]">
      {metrics.map((metric, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 p-5 border-r border-border group hover:bg-foreground/[0.01] transition-all cursor-crosshair relative overflow-hidden",
            i === metrics.length - 1 && "border-r-0"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                metric.status === "success" ? "bg-success" :
                  metric.status === "warning" ? "bg-warning" : "bg-error"
              )} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20 group-hover:text-foreground/40 transition-colors">
                {metric.label}
              </span>
            </div>
            <MicroTrend
              data={metric.trend}
              color={
                metric.status === "success" ? "var(--color-success)" :
                  metric.status === "warning" ? "var(--color-warning)" : "var(--color-error)"
              }
            />
          </div>

          <div className="flex items-end justify-between">
            <p className="text-xl font-black text-foreground/80 tracking-tighter tabular-nums">{metric.value}</p>
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
