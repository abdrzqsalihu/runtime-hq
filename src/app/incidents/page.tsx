"use client";

import {
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Terminal,
  MoreHorizontal,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

const incidents = [
  {
    id: "EVENT_9821",
    title: "DISTRIBUTED_API_LATENCY_SPIKE",
    status: "Investigating",
    severity: "Critical",
    startedAt: "24m ago",
    duration: "Ongoing",
    affected: ["STRIPE_GATEWAY", "VERCEL_EDGE"],
    rootCause: "PENDING_ANALYSIS",
  },
  {
    id: "EVENT_9818",
    title: "DB_POOL_EXHAUSTION_NODE_B",
    status: "Resolved",
    severity: "Medium",
    startedAt: "14:20 UTC",
    duration: "45m",
    affected: ["SUPABASE_DB_CLUSTER"],
    rootCause: "UNEXPECTED_TRAFFIC_SURGE",
  },
  {
    id: "EVENT_9815",
    title: "S3_OBJECT_STORAGE_TIMEOUT",
    status: "Resolved",
    severity: "Critical",
    startedAt: "09:12 UTC",
    duration: "4h 12m",
    affected: ["AWS_US_EAST_1", "S3_STORAGE"],
    rootCause: "REGIONAL_NETWORK_PARTITION",
  },
];

export default function IncidentsPage() {
  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-error" />
            <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">Incident_Mission_Control</h2>
          </div>
          <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">Vertical event timeline & failure analysis log</p>
        </div>
        <button className="flex items-center gap-2 bg-error text-white px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-error/90 transition-all">
          <Terminal className="w-3.5 h-3.5" />
          DECLARE_CRITICAL_EVENT
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Analytics / Stats Sidebar */}
        <div className="space-y-4">
          <div className="surface border border-border rounded-sm p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-6 flex items-center gap-2">
              <Info className="w-3 h-3" />
              SYSTEM_FAILURE_METRICS
            </h3>
            <div className="space-y-6">
              <div>
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-1">MTTR_AVG</div>
                <div className="text-xl font-black text-foreground/80 tracking-tighter tabular-nums">42m 12s</div>
              </div>
              <div>
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-1">INCIDENT_DENSITY</div>
                <div className="text-xl font-black text-foreground/80 tracking-tighter tabular-nums">0.8/day</div>
              </div>
              <div className="pt-4 border-t border-border/50">
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-3">SEVERITY_DISTRIBUTION</div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-foreground/[0.03]">
                  <div className="h-full bg-error" style={{ width: "20%" }} />
                  <div className="h-full bg-warning" style={{ width: "45%" }} />
                  <div className="h-full bg-success/40" style={{ width: "35%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Timeline */}
        <div className="lg:col-span-3 space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-border/50">
          {incidents.map((incident) => (
            <div key={incident.id} className="relative pl-12">
              {/* Timeline dot */}
              <div className={cn(
                "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center z-10",
                incident.status === "Investigating" ? "bg-error" : "bg-border"
              )}>
                {incident.status === "Investigating" ? (
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                )}
              </div>

              <div className="surface border border-border rounded-sm p-6 group hover:border-accent/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-foreground/20">{incident.id}</span>
                    <div className={cn(
                      "px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border",
                      incident.severity === "Critical" ? "text-error border-error/20 bg-error/5" : "text-warning border-warning/20 bg-warning/5"
                    )}>
                      {incident.severity}
                    </div>
                    <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">{incident.startedAt}</span>
                  </div>
                  <button className="text-foreground/10 hover:text-foreground/40 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-8">
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-foreground/80 uppercase tracking-tight mb-3 group-hover:text-accent transition-colors">
                      {incident.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {incident.affected.map(res => (
                        <span key={res} className="text-[8px] font-black uppercase px-2 py-0.5 border border-border text-foreground/30 bg-foreground/[0.02]">
                          {res}
                        </span>
                      ))}
                    </div>
                    <div className="p-4 bg-foreground/[0.02] border border-border/50 rounded-sm">
                      <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-1">Root_Cause_Analysis</div>
                      <div className="text-[10px] font-bold text-foreground/60 uppercase tracking-tight">{incident.rootCause}</div>
                    </div>
                  </div>

                  <div className="text-right min-w-24">
                    <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-1">Duration</div>
                    <div className="text-[11px] font-black text-foreground/60 tabular-nums uppercase">{incident.duration}</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-sm bg-foreground/10 border border-background flex items-center justify-center text-[8px] font-bold text-foreground/40 uppercase">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                    </div>
                    <span className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest">3 Responders_Active</span>
                  </div>
                  <button className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-accent hover:gap-2 transition-all">
                    INSPECT_EVENT_FLOW
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
