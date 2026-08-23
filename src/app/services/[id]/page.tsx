/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  Clock,
  AlertCircle,
  Terminal,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
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
  startedAt: string;
  resolvedAt: string | null;
}

interface Service {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
  endpointUrl: string;
  region: string;
  lastHeartbeatAt: string | null;
  lastLatencyMs: number | null;
  lastErrorRate: number | null;
  createdAt: string;
  updatedAt: string;
  checks: ServiceCheck[];
  incidentLinks: Array<{ incident: Incident }>;
}

export default function ServiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const serviceId = Array.isArray(id) ? id[0] : id;

  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<ServiceCheck | null>(
    null,
  );
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(
    null,
  );

  const fetchService = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/services/${serviceId}`);
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Service not found"
            : "Failed to fetch service",
        );
      }
      const data = await response.json();
      setService(data.service);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  const handleCheckNow = async () => {
    if (checking) return;

    try {
      setChecking(true);
      setCheckError(null);
      setLastCheckResult(null);
      setRateLimitRemaining(null);

      const response = await fetch(`/api/services/${serviceId}/check`, {
        method: "POST",
      });

      if (response.status === 429) {
        const data = await response.json();
        setCheckError(data.message);
        setRateLimitRemaining(data.retryAfter);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setCheckError(data.message || "Check failed");
        return;
      }

      const data = await response.json();
      setLastCheckResult(data.check);
      await fetchService();
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <Link
            href="/services"
            className="p-2 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all text-foreground/20 hover:text-accent inline-flex"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="w-8 h-8 text-error" />
          <p className="text-foreground/60">{error}</p>
          <Link
            href="/services"
            className="px-4 py-2 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest text-foreground/30 hover:text-accent hover:border-accent/40 transition-all"
          >
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  if (!service) {
    return null;
  }

  const statusIcon = {
    OPERATIONAL: CheckCircle,
    DEGRADED: AlertTriangle,
    OUTAGE: XCircle,
  }[service.status];

  const statusColor = {
    OPERATIONAL: "text-success/60",
    DEGRADED: "text-warning/60",
    OUTAGE: "text-error/60",
  }[service.status];

  const statusBg = {
    OPERATIONAL: "bg-success",
    DEGRADED: "bg-warning",
    OUTAGE: "bg-error",
  }[service.status];

  const incidentsForService = service.incidentLinks.map(
    (link) => link.incident,
  );

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
                {service.name} <span className="text-foreground/10">//</span>{" "}
                SERVICE_INSPECT
              </h2>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-0.5 rounded-sm border",
                  statusColor,
                  statusBg,
                  "text-black/90 text-[9px] font-black uppercase tracking-widest",
                )}
              >
                <div className={cn("w-1 h-1 rounded-full", statusBg)} />
                {service.status}
              </div>
            </div>
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em] mt-1">
              Region: {service.region} • Category: {service.category}
            </p>
          </div>
        </div>

        <button
          onClick={handleCheckNow}
          disabled={checking || rateLimitRemaining !== null}
          className={cn(
            "px-4 py-2 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer",
            checking
              ? "bg-foreground/10 text-foreground/40"
              : rateLimitRemaining !== null
                ? "bg-warning/10 text-warning/60 border border-warning/20"
                : "bg-accent text-black hover:bg-accent/80",
          )}
        >
          {checking ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              CHECKING...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              CHECK NOW
            </>
          )}
        </button>
      </div>

      {checkError && (
        <div className="mb-6 p-4 border border-warning/20 bg-warning/5 rounded-sm flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-warning uppercase">
              Check Error
            </p>
            <p className="text-[9px] text-warning/60 mt-1">{checkError}</p>
            {rateLimitRemaining !== null && (
              <p className="text-[9px] text-foreground/40 mt-1">
                Retry in {rateLimitRemaining}s
              </p>
            )}
          </div>
        </div>
      )}

      {lastCheckResult && (
        <div className="mb-6 p-4 border border-success/20 bg-success/5 rounded-sm flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-success uppercase">
              Check Complete
            </p>
            <p className="text-[9px] text-success/60 mt-1">
              HTTP {lastCheckResult.httpStatus} • {lastCheckResult.latencyMs}ms
              • {lastCheckResult.message}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-border border border-border rounded-sm overflow-hidden">
        {/* Main Panel */}
        <div className="lg:col-span-3 bg-background p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-accent" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80">
                  Check_History_Timeline
                </h3>
              </div>
            </div>

            {service.checks.length === 0 ? (
              <div className="flex items-center justify-center py-12 border border-dashed border-border rounded-sm">
                <p className="text-[10px] text-foreground/30 uppercase font-bold">
                  AWAITING_FIRST_CHECK
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {service.checks.slice(0, 10).map((check) => {
                  const checkTime = new Date(check.checkedAt);
                  const now = new Date();
                  const secondsAgo = Math.floor(
                    (now.getTime() - checkTime.getTime()) / 1000,
                  );

                  let timeLabel = "";
                  if (secondsAgo < 60) timeLabel = "just now";
                  else if (secondsAgo < 3600)
                    timeLabel = `${Math.floor(secondsAgo / 60)}m ago`;
                  else timeLabel = `${Math.floor(secondsAgo / 3600)}h ago`;

                  const isSuccess = check.status === "OPERATIONAL";
                  return (
                    <div
                      key={check.id}
                      className="p-3 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              isSuccess
                                ? "bg-success"
                                : check.status === "DEGRADED"
                                  ? "bg-warning"
                                  : "bg-error",
                            )}
                          />
                          <span className="text-[9px] font-bold text-foreground/60">
                            HTTP {check.httpStatus || "timeout"} •{" "}
                            {check.latencyMs}ms
                          </span>
                        </div>
                        <span className="text-[8px] text-foreground/30 font-bold uppercase">
                          {timeLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-8 border-t border-border pt-8">
            {[
              {
                label: "LAST_LATENCY",
                value: service.lastLatencyMs
                  ? `${service.lastLatencyMs}ms`
                  : "—",
                icon: Clock,
              },
              {
                label: "ERROR_RATE",
                value:
                  service.lastErrorRate !== null
                    ? `${service.lastErrorRate.toFixed(1)}%`
                    : "—",
                icon: AlertCircle,
              },
              {
                label: "TOTAL_CHECKS",
                value: service.checks.length,
                icon: Activity,
              },
              {
                label: "LAST_HEARTBEAT",
                value: service.lastHeartbeatAt
                  ? new Date(service.lastHeartbeatAt).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )
                  : "Never",
                icon: Clock,
              },
            ].map((m, i) => (
              <div key={i} className="border-l border-border pl-6">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="w-3 h-3 text-foreground/20" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-foreground/20">
                    {m.label}
                  </span>
                </div>
                <div className="text-lg font-black text-foreground/70 tracking-tighter tabular-nums">
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="bg-foreground/[0.01] flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-foreground/40" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
                Service_Info
              </h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-1">
                ENDPOINT
              </div>
              <a
                href={service.endpointUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-accent hover:underline flex items-center gap-1 break-all"
              >
                {service.endpointUrl.replace(/https?:\/\//, "")}
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              </a>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-2">
                RECENT_INCIDENTS
              </div>
              {incidentsForService.length === 0 ? (
                <p className="text-[9px] text-foreground/30">
                  No incidents recorded
                </p>
              ) : (
                <div className="space-y-2">
                  {incidentsForService.slice(0, 5).map((incident) => (
                    <Link
                      key={incident.id}
                      href={`/incidents/${incident.id}`}
                      className="p-2 border border-border rounded-sm bg-background hover:bg-foreground/[0.02] hover:border-accent/30 transition-all block"
                    >
                      <p className="text-[8px] font-bold text-foreground/60 line-clamp-2 group-hover:text-accent">
                        {incident.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={cn(
                            "text-[7px] font-black px-1 rounded-sm uppercase",
                            incident.severity === "CRITICAL"
                              ? "text-error bg-error/10"
                              : incident.severity === "MEDIUM"
                                ? "text-warning bg-warning/10"
                                : "text-foreground/30 bg-foreground/5",
                          )}
                        >
                          {incident.severity}
                        </span>
                        <span
                          className={cn(
                            "text-[7px] font-black px-1 rounded-sm uppercase",
                            incident.status === "RESOLVED"
                              ? "text-foreground/30 bg-foreground/5"
                              : "text-warning bg-warning/10",
                          )}
                        >
                          {incident.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-2">
                METADATA
              </div>
              <div className="space-y-1 text-[9px] text-foreground/40">
                <div>
                  Created: {new Date(service.createdAt).toLocaleDateString()}
                </div>
                <div>
                  Updated: {new Date(service.updatedAt).toLocaleDateString()}
                </div>
                <div>ID: {service.id.slice(0, 8)}...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
