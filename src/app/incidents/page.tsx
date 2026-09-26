"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Terminal,
  Info,
  Loader2,
  AlertCircle,
  Zap,
  Eye,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DeclareIncidentModal } from "@/components/incidents/DeclareIncidentModal";

interface Incident {
  id: string;
  title: string;
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  startedAt: string;
  resolvedAt: string | null;
  automatic: boolean;
  createdAt: string;
  updatedAt: string;
  services: Array<{ service: { name: string; slug: string } }>;
  events: Array<{ id: string; message: string; timestamp: string }>;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/incidents");
      if (!response.ok) throw new Error("Failed to fetch incidents");
      const data = await response.json();
      setIncidents(data.incidents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const calculateMetrics = () => {
    const resolved = incidents.filter(
      (i) => i.status === "RESOLVED" && i.resolvedAt,
    );

    // MTTR is measured on incidents the monitoring engine opened and resolved, so hand-entered or
    // imported records with arbitrary timestamps cannot skew it.
    const measured = resolved.filter((i) => i.automatic);
    let mttrMs = 0;
    if (measured.length > 0) {
      const totalMs = measured.reduce((sum, incident) => {
        const start = new Date(incident.startedAt).getTime();
        const end = new Date(incident.resolvedAt!).getTime();
        return sum + (end - start);
      }, 0);
      mttrMs = Math.round(totalMs / measured.length);
    }

    const formatDuration = (ms: number) => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m ${seconds}s`;
    };

    const severityCounts = {
      CRITICAL: incidents.filter((i) => i.severity === "CRITICAL").length,
      MEDIUM: incidents.filter((i) => i.severity === "MEDIUM").length,
      LOW: incidents.filter((i) => i.severity === "LOW").length,
    };

    const total =
      severityCounts.CRITICAL + severityCounts.MEDIUM + severityCounts.LOW;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const resolvedLast7Days = resolved.filter(
      (i) => new Date(i.resolvedAt!).getTime() >= sevenDaysAgo,
    ).length;

    return {
      mttr: measured.length > 0 ? formatDuration(mttrMs) : "No data",
      density: (resolvedLast7Days / 7).toFixed(1) + "/day",
      severityCounts,
      total,
    };
  };

  const metrics = calculateMetrics();
  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED");

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (secondsAgo < 60) return "just now";
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "Ongoing";
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const ms = endMs - startMs;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-error" />
            <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">
              Automatic_Incident_Detection
            </h2>
          </div>
          <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">
            Vertical event timeline & failure analysis log
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-error text-white px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-error/90 transition-all"
        >
          <Terminal className="w-3.5 h-3.5" />
          DECLARE_CRITICAL_EVENT
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-error/20 bg-error/5 rounded-sm flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-error/60">{error}</p>
        </div>
      )}

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
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-1">
                  MTTR_AVG (AUTO)
                </div>
                <div className="text-xl font-black text-foreground/80 tracking-tighter tabular-nums">
                  {metrics.mttr}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-1">
                  RESOLVED_LAST_7D
                </div>
                <div className="text-xl font-black text-foreground/80 tracking-tighter tabular-nums">
                  {metrics.density}
                </div>
              </div>
              <div className="pt-4 border-t border-border/50">
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-3">
                  BY_SEVERITY
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-foreground/[0.03]">
                  {metrics.total > 0 && (
                    <>
                      {metrics.severityCounts.CRITICAL > 0 && (
                        <div
                          className="h-full bg-error"
                          style={{
                            width: `${(metrics.severityCounts.CRITICAL / metrics.total) * 100}%`,
                          }}
                        />
                      )}
                      {metrics.severityCounts.MEDIUM > 0 && (
                        <div
                          className="h-full bg-warning"
                          style={{
                            width: `${(metrics.severityCounts.MEDIUM / metrics.total) * 100}%`,
                          }}
                        />
                      )}
                      {metrics.severityCounts.LOW > 0 && (
                        <div
                          className="h-full bg-success/40"
                          style={{
                            width: `${(metrics.severityCounts.LOW / metrics.total) * 100}%`,
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Timeline */}
        <div className="lg:col-span-3">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80 mb-6">
            Incident_Timeline
          </h3>
          <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-border/50">
            {incidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-sm gap-3">
                <CheckCircle2 className="w-8 h-8 text-success" />
                <p className="text-[10px] text-foreground/30 uppercase font-bold">
                  NO_INCIDENTS_DETECTED
                </p>
                <p className="text-[9px] text-foreground/20">
                  All services are operating normally
                </p>
              </div>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="relative pl-9 sm:pl-12">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center z-10",
                      incident.status !== "RESOLVED" ? "bg-error" : "bg-border",
                    )}
                  >
                    {incident.status !== "RESOLVED" ? (
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-success" />
                    )}
                  </div>

                  <Link
                    href={`/incidents/${incident.id}`}
                    className="surface border border-border rounded-sm p-4 sm:p-6 group hover:border-accent/30 transition-all block"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/20">
                          {incident.id.slice(0, 8)}
                        </span>
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border",
                            incident.severity === "CRITICAL"
                              ? "text-error border-error/20 bg-error/5"
                              : incident.severity === "MEDIUM"
                                ? "text-warning border-warning/20 bg-warning/5"
                                : "text-success border-success/20 bg-success/5",
                          )}
                        >
                          {incident.severity}
                        </div>
                        {/* Auto-detected badge */}
                        {incident.automatic && (
                          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-accent/10 text-accent border border-accent/20">
                            Auto
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
                          {formatTime(incident.startedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-8">
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-foreground/80 uppercase tracking-tight mb-3 group-hover:text-accent transition-colors">
                          {incident.title}
                        </h3>
                        {incident.services.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {incident.services.map((link) => (
                              <span
                                key={link.service.slug}
                                className="text-[8px] font-black uppercase px-2 py-0.5 border border-border text-foreground/30 bg-foreground/[0.02]"
                              >
                                {link.service.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {incident.events.length > 0 && (
                          <div className="p-4 bg-foreground/[0.02] border border-border/50 rounded-sm">
                            <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-1">
                              Latest_Event
                            </div>
                            <div className="text-[10px] font-bold text-foreground/60 uppercase tracking-tight">
                              {incident.events[0].message}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right sm:min-w-24">
                        <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 mb-1">
                          Duration
                        </div>
                        <div className="text-[11px] font-black text-foreground/60 tabular-nums uppercase">
                          {formatDuration(
                            incident.startedAt,
                            incident.resolvedAt,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/30 flex items-center justify-between">
                      <div className="text-[8px] font-bold text-foreground/20 uppercase tracking-widest">
                        {incident.status}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-accent group-hover:gap-2 transition-all">
                        INSPECT_EVENT_FLOW
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DeclareIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchIncidents}
      />
    </div>
  );
}
