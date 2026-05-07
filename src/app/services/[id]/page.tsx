/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Clock,
  AlertCircle,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn, createSeededRng } from "@/lib/utils";

const systemLogs = [
  { time: "14:32:01", severity: "INFO", message: "Node synchronization complete", region: "US_EAST_1" },
  { time: "14:31:55", severity: "WARN", message: "Increased latency detected on sub-route /v1/auth", region: "EU_WEST_1" },
  { time: "14:31:42", severity: "INFO", message: "Heartbeat pulse verified (24ms)", region: "GLOBAL" },
  { time: "14:30:12", severity: "ERROR", message: "TCP handshake timeout on peer 192.168.1.42", region: "AP_SOUTH_1" },
  { time: "14:28:55", severity: "INFO", message: "Auto-scaling event triggered: +2 instances", region: "US_EAST_1" },
];

export default function ServiceDetailPage() {
  const { id } = useParams();
  const idStr = Array.isArray(id) ? id[0] : id;
  const idKey = String(idStr ?? "");

  const timeline = useMemo(() => {
    const rand = createSeededRng(`timeline:${idKey}`);
    return Array.from({ length: 80 }, () => ({
      anomaly: rand() > 0.9,
      height: 20 + rand() * 80,
    }));
  }, [idKey]);

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/services"
            className="p-2 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all text-foreground/20 hover:text-accent"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-foreground/90 tracking-tighter uppercase">
                {String(id).toUpperCase()} <span className="text-foreground/10">//</span> SYSTEM_INSPECT
              </h2>
              <div className="flex items-center gap-2 px-2 py-0.5 rounded-sm border border-success/20 bg-success/5 text-success text-[9px] font-black uppercase tracking-widest">
                <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
                LIVE_PULSE_ACTIVE
              </div>
            </div>
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em] mt-1">Resource: {id}-primary-node • Region: US_EAST_1_VPC</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest text-foreground/30 hover:text-foreground transition-all">
            EXEC_DUMP_LOGS
          </button>
          <button className="px-4 py-2 bg-accent text-black rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all">
            SYSTEM_CONFIG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-border border border-border rounded-sm overflow-hidden">
        {/* Signal Panel / Event Stream */}
        <div className="lg:col-span-3 bg-background p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-accent" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">Signal_Flux_Timeline</h3>
            </div>
            <div className="flex items-center gap-6 text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent/40" /> REQUESTS</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-error/40" /> ANOMALIES</span>
            </div>
          </div>

          <div className="h-[300px] flex items-end gap-1 mb-8">
            {timeline.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col gap-1 items-center group cursor-crosshair">
                {item.anomaly && (
                  <div className="w-1.5 h-1.5 bg-error rounded-full mb-1" />
                )}
                <div
                  className={cn(
                    "w-full bg-accent/20 rounded-t-sm transition-all group-hover:bg-accent",
                    i % 10 === 0 ? "bg-accent/40" : ""
                  )}
                  style={{ height: `${item.height}%` }}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-8">
            {[
              { label: "LATENCY_P99", value: "142ms", icon: Clock },
              { label: "UPTIME_STATE", value: "99.98%", icon: Activity },
              { label: "ERROR_RATE", value: "0.04%", icon: AlertCircle },
              { label: "THROUGHPUT", value: "1.2GB/s", icon: Zap },
            ].map((m, i) => (
              <div key={i} className="border-l border-border pl-6">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="w-3 h-3 text-foreground/20" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-foreground/20">{m.label}</span>
                </div>
                <div className="text-xl font-black text-foreground/70 tracking-tighter tabular-nums">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* System Logs / Incident Stream */}
        <div className="bg-foreground/[0.01] flex flex-col h-[600px]">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-foreground/40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">System_Log_Stream</h3>
            </div>
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono">
            {systemLogs.map((log, i) => (
              <div key={i} className="p-2 border border-transparent hover:border-border hover:bg-background transition-all group cursor-default">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-foreground/20">{log.time}</span>
                  <span className={cn(
                    "text-[8px] font-black px-1 rounded-sm",
                    log.severity === "ERROR" ? "text-error bg-error/10" :
                      log.severity === "WARN" ? "text-warning bg-warning/10" : "text-foreground/30 bg-foreground/5"
                  )}>
                    {log.severity}
                  </span>
                </div>
                <p className="text-[10px] text-foreground/60 leading-relaxed group-hover:text-foreground/90 transition-colors">
                  {log.message}
                </p>
                <div className="mt-1 text-[8px] font-bold text-foreground/10 uppercase tracking-widest">
                  SOURCE: {log.region}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-background">
            <button className="w-full py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest text-foreground/20 hover:text-accent hover:border-accent/40 transition-all">
              RELOAD_BUFFER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
