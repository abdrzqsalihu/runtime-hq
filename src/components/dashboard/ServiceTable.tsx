"use client";

import React, { useState } from "react";
import { MoreHorizontal, ChevronDown, ChevronRight, Terminal, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceCheck {
  id: string;
  checkedAt: string;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  latencyMs: number | null;
  httpStatus: number | null;
  errorRate: number | null;
  message: string | null;
}

interface Incident {
  id: string;
  title: string;
  status: string;
  severity: string;
}

interface Service {
  id: string;
  slug: string;
  name: string;
  category: string;
  endpointUrl: string;
  region: string;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  lastHeartbeatAt: string | null;
  lastLatencyMs: number | null;
  lastErrorRate: number | null;
  checks: ServiceCheck[];
  incidentLinks: Array<{
    incidentId: string;
    serviceId: string;
    incident: Incident;
  }>;
}

interface ServiceTableProps {
  services: Service[];
  loading: boolean;
}

const statusStyles = {
  OPERATIONAL: "bg-success",
  DEGRADED: "bg-warning",
  OUTAGE: "bg-error",
};

const statusColors = {
  OPERATIONAL: "text-success/80",
  DEGRADED: "text-warning/80",
  OUTAGE: "text-error/80",
};

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ServiceTable({ services, loading }: ServiceTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-background p-12 flex items-center justify-center text-foreground/40">
        <p className="text-[9px] uppercase tracking-widest">Loading services...</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-background p-12 flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-5 h-5 text-warning" />
        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">No services monitored</p>
        <p className="text-[9px] text-foreground/30">Add your first service to get started monitoring</p>
      </div>
    );
  }

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

        <div className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">
          {services.length} service{services.length !== 1 ? "s" : ""} monitored
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
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Error_Rate</th>
              <th className="px-6 py-3 text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Last_Check</th>
              <th className="w-10 px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {services.map((service) => {
              // If no checks yet, show AWAITING_CHECK instead of database status
              const displayStatus = service.checks.length === 0 ? "AWAITING_CHECK" : service.status;

              return (
              <React.Fragment key={service.id}>
                <tr
                  onClick={() => setExpandedId(expandedId === service.id ? null : service.id)}
                  className={cn(
                    "hover:bg-foreground/[0.03] transition-colors group cursor-pointer",
                    expandedId === service.id && "bg-foreground/[0.04]"
                  )}
                >
                  <td className="px-6 py-4">
                    {expandedId === service.id ? (
                      <ChevronDown className="w-3 h-3 text-accent" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-foreground/40 group-hover:text-foreground/60" />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-foreground/80 tracking-tight uppercase group-hover:text-accent transition-colors">
                      {service.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-bold text-foreground/50 uppercase tracking-tighter">{service.region}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        displayStatus === "AWAITING_CHECK" ? "bg-foreground/40" :
                        displayStatus === "OPERATIONAL" ? "bg-success" :
                        displayStatus === "DEGRADED" ? "bg-warning" : "bg-error"
                      )} />
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        displayStatus === "AWAITING_CHECK" ? "text-foreground/40" :
                        displayStatus === "OPERATIONAL" ? "text-success/80" :
                        displayStatus === "DEGRADED" ? "text-warning/80" : "text-error/80"
                      )}>
                        {displayStatus === "AWAITING_CHECK" ? "Awaiting Check" : displayStatus}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-foreground/70 tabular-nums">
                      {service.lastLatencyMs ? `${service.lastLatencyMs}ms` : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-foreground/60 tabular-nums">
                      {service.lastErrorRate !== null ? `${service.lastErrorRate.toFixed(2)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-tighter tabular-nums">
                      {formatTimeAgo(service.lastHeartbeatAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <MoreHorizontal className="w-3.5 h-3.5 text-foreground/30 group-hover:text-foreground/60" />
                  </td>
                </tr>

                {expandedId === service.id && (
                  <tr className="bg-foreground/[0.05] border-t border-border/50">
                    <td colSpan={8} className="px-12 py-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Checks */}
                        <div>
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground/50 mb-4">Recent_Health_Checks</h4>
                          {service.checks.length === 0 ? (
                            <p className="text-[9px] text-foreground/30">No checks recorded yet</p>
                          ) : (
                            <div className="space-y-2">
                              {service.checks.slice(0, 8).map((check) => (
                                <div key={check.id} className="flex items-center justify-between p-2 border border-border/20 rounded-sm hover:bg-foreground/[0.02] transition-colors">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div
                                      className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        check.status === "OPERATIONAL"
                                          ? "bg-success"
                                          : check.status === "DEGRADED"
                                            ? "bg-warning"
                                            : "bg-error"
                                      )}
                                    />
                                    <span className="text-[8px] font-bold text-foreground/40 uppercase tracking-tighter truncate">
                                      {new Date(check.checkedAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <span className="text-[8px] font-black text-foreground/60 tabular-nums">
                                      {check.latencyMs ? `${check.latencyMs}ms` : "—"}
                                    </span>
                                    {check.httpStatus && (
                                      <span className={cn("text-[8px] font-bold px-1 rounded-sm", check.httpStatus < 400 ? "bg-success/10 text-success/80" : "bg-error/10 text-error/80")}>
                                        {check.httpStatus}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Incidents & Metadata */}
                        <div>
                          <div className="space-y-6">
                            {/* Associated Incidents */}
                            <div>
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground/50 mb-3">Associated_Incidents</h4>
                              {service.incidentLinks.length === 0 ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-success" />
                                  <p className="text-[9px] text-foreground/40">No open incidents</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {service.incidentLinks.map((link) => (
                                    <div key={link.incidentId} className="p-2 border border-warning/20 bg-warning/5 rounded-sm">
                                      <p className="text-[8px] font-bold text-foreground/60 truncate">{link.incident.title}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span
                                          className={cn(
                                            "text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase",
                                            link.incident.severity === "CRITICAL"
                                              ? "bg-error/10 text-error/80"
                                              : link.incident.severity === "MEDIUM"
                                                ? "bg-warning/10 text-warning/80"
                                                : "bg-foreground/10 text-foreground/60"
                                          )}
                                        >
                                          {link.incident.severity}
                                        </span>
                                        <span className="text-[7px] text-foreground/40">{link.incident.status}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Service Metadata */}
                            <div>
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-foreground/50 mb-3">Service_Details</h4>
                              <div className="space-y-2 text-[8px]">
                                <div className="flex justify-between">
                                  <span className="text-foreground/40">Category:</span>
                                  <span className="text-foreground/60">{service.category}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground/40">Endpoint:</span>
                                  <span className="text-foreground/60 truncate ml-2">{service.endpointUrl}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground/40">Total Checks:</span>
                                  <span className="text-foreground/60">{service.checks.length}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
