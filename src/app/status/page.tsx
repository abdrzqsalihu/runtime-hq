"use client";

import { ShieldCheck, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const services = [
  { name: "PAYMENT_GATEWAY", status: "Operational" },
  { name: "GLOBAL_EDGE_CDN", status: "Operational" },
  { name: "AUTH_SUBSYSTEM", status: "Operational" },
  { name: "API_INFRASTRUCTURE", status: "Degraded" },
  { name: "DATABASE_CLUSTER", status: "Operational" },
  { name: "MESSAGE_BUS", status: "Outage" },
];

export default function StatusPage() {
  return (
    <div className="max-w-xl mx-auto py-20 px-6">
      {/* OS Brand Header */}
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-accent rounded-sm flex items-center justify-center">
            <ShieldCheck className="w-3 h-3 text-black" />
          </div>
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-foreground/80">RUNTIME HQ</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-foreground/20">
          <Globe className="w-3 h-3" />
          PUBLIC_STATUS_FEED
        </div>
      </div>

      {/* Primary System State */}
      <div className="mb-20 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-2 border border-warning/20 bg-warning/5 rounded-sm mb-6">
          <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-warning">Partial_System_Degradation</span>
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground/90 leading-tight">
          Some systems are experiencing <br /> reduced performance.
        </h1>
        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-6">
          Last verified: 2026-04-25 // 14:32:01 UTC
        </p>
      </div>

      {/* Registry Grid */}
      <div className="border border-border rounded-sm overflow-hidden mb-16">
        <div className="px-6 py-3 bg-foreground/[0.02] border-b border-border flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-foreground/20">System_Component</span>
          <span className="text-[9px] font-black uppercase tracking-widest text-foreground/20">State</span>
        </div>
        <div className="divide-y divide-border/50">
          {services.map((service) => (
            <div key={service.name} className="px-6 py-4 flex items-center justify-between group hover:bg-foreground/[0.01] transition-colors">
              <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-tight group-hover:text-foreground transition-colors">{service.name}</span>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  service.status === "Operational" ? "text-success/60" :
                    service.status === "Degraded" ? "text-warning/60" : "text-error/60"
                )}>
                  {service.status}
                </span>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  service.status === "Operational" ? "bg-success" :
                    service.status === "Degraded" ? "bg-warning" : "bg-error"
                )} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <div className="text-[8px] font-black uppercase tracking-[0.4em] text-foreground/10 mb-8">
          End_of_Transmission
        </div>
        <div className="flex justify-center gap-8">
          {["Support", "Documentation", "API_Status"].map(link => (
            <button key={link} className="text-[9px] font-black uppercase tracking-widest text-foreground/20 hover:text-accent transition-colors">
              {link}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
