"use client";

import React, { useState } from "react";
import { Search, Filter, MoreHorizontal, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { cn, createSeededRng } from "@/lib/utils";

type Status = "Operational" | "Degraded" | "Outage";

interface Service {
  id: string;
  name: string;
  region: string;
  status: Status;
  latency: string;
  errorRate: string;
  lastHeartbeat: string;
}

const services: Service[] = [
  {
    id: "STRIPE-API-01",
    name: "STRIPE_API",
    region: "US_EAST_1",
    status: "Operational",
    latency: "124ms",
    errorRate: "0.01%",
    lastHeartbeat: "0.4s ago",
  },
  {
    id: "AWS-EC2-VPC",
    name: "AWS_INFRA_CORE",
    region: "EU_CENTRAL",
    status: "Degraded",
    latency: "245ms",
    errorRate: "1.24%",
    lastHeartbeat: "1.2s ago",
  },
  {
    id: "GH-ACTIONS-RUNNER",
    name: "GITHUB_ACTIONS",
    region: "GLOBAL_EDGE",
    status: "Operational",
    latency: "89ms",
    errorRate: "0.00%",
    lastHeartbeat: "2.1s ago",
  },
  {
    id: "SMTP-RELAY-SG",
    name: "SENDGRID_RELAY",
    region: "US_WEST_2",
    status: "Outage",
    latency: "---",
    errorRate: "100%",
    lastHeartbeat: "45.0s ago",
  },
  {
    id: "VERCEL-EDGE-V8",
    name: "VERCEL_RUNTIME",
    region: "GLOBAL_ANYCAST",
    status: "Operational",
    latency: "42ms",
    errorRate: "0.01%",
    lastHeartbeat: "0.1s ago",
  },
];

const statusStyles = {
  Operational: "bg-success",
  Degraded: "bg-warning",
  Outage: "bg-error",
};

const trafficHeightsByServiceId: Record<string, number[]> = Object.fromEntries(
  services.map((service) => {
    const rand = createSeededRng(`traffic:${service.id}`);
    const heights = Array.from({ length: 40 }, () => 5 + rand() * 95);
    return [service.id, heights] as const;
  })
);

export function ServiceTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-background">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Active_Monitor_Registry</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Live_Monitoring</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" />
            <input
              type="text"
              placeholder="SEARCH_REGISTRY..."
              className="pl-8 pr-4 py-1.5 bg-foreground/[0.03] border border-border rounded-sm text-[9px] font-bold tracking-wider w-48 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-sm text-[9px] font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.05] transition-all cursor-pointer active:bg-foreground/[0.1]">
            <Filter className="w-3 h-3" />
            Filter_Services
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-foreground/[0.02] border-b border-border">
              <th className="w-10 px-6 py-3"></th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Service</th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Region</th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Status</th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Latency</th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Err_Rate</th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Last_Check</th>
              <th className="w-10 px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {services.map((service) => (
              <React.Fragment key={service.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}
                  className={cn(
                    "hover:bg-foreground/[0.03] transition-colors group cursor-pointer",
                    expandedId === service.id && "bg-foreground/[0.04]"
                  )}
                >
                  <td className="px-6 py-4">
                    {expandedId === service.id ? <ChevronDown className="w-3 h-3 text-accent" /> : <ChevronRight className="w-3 h-3 text-foreground/40 group-hover:text-foreground/60" />}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-foreground/80 tracking-tight uppercase group-hover:text-accent transition-colors">{service.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-bold text-foreground/50 uppercase tracking-tighter">{service.region}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", statusStyles[service.status])} />
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        service.status === "Operational" ? "text-success/80" :
                          service.status === "Degraded" ? "text-warning/80" : "text-error/80"
                      )}>
                        {service.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-foreground/70 tabular-nums">{service.latency}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-foreground/60 tabular-nums">{service.errorRate}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-tighter tabular-nums">{service.lastHeartbeat}</span>
                  </td>
                  <td className="px-6 py-4">
                    <MoreHorizontal className="w-3.5 h-3.5 text-foreground/30 group-hover:text-foreground/60" />
                  </td>
                </tr>
                {expandedId === service.id && (
                  <tr className="bg-foreground/[0.05] border-t border-border/50">
                    <td colSpan={8} className="px-12 py-6">
                      <div className="grid grid-cols-3 gap-8">
                        <div>
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground/50 mb-4">Internal_Node_Status</h4>
                          <div className="space-y-3">
                            {[
                              { label: "NODE_CPU", val: "12.4%" },
                              { label: "NODE_MEM", val: "44.1GB" },
                              { label: "NODE_DSK", val: "882GB" },
                            ].map(node => (
                              <div key={node.label} className="flex items-center justify-between border-b border-border/20 pb-1">
                                <span className="text-[8px] font-bold text-foreground/40 uppercase">{node.label}</span>
                                <span className="text-[9px] font-black text-foreground/70 tabular-nums">{node.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground/50 mb-4">Live_Traffic_Flow</h4>
                          <div className="h-24 w-full flex items-end gap-[2px]">
                            {trafficHeightsByServiceId[service.id].map((height, i) => (
                              <div
                                key={i}
                                className="flex-1 bg-accent/30 hover:bg-accent/70 transition-colors rounded-t-sm cursor-pointer"
                                style={{ height: `${height}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
