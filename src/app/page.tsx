"use client";

import { KPICards } from "@/components/dashboard/KPICards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { ServiceTable } from "@/components/dashboard/ServiceTable";
import { Terminal, Plus, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { AddMonitorModal } from "@/components/dashboard/AddMonitorModal";

interface KPI {
  totalUptimePercent: number;
  activeServices: number;
  avgResponseTimeMs: number | null;
  activeIncidents: number;
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
  createdAt: string;
  updatedAt: string;
  checks: Array<{
    id: string;
    checkedAt: string;
    status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
    latencyMs: number | null;
    httpStatus: number | null;
    errorRate: number | null;
    message: string | null;
  }>;
  incidentLinks: Array<{
    incidentId: string;
    serviceId: string;
    incident: {
      id: string;
      title: string;
      status: string;
      severity: string;
      startedAt: string;
      resolvedAt: string | null;
    };
  }>;
}

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, servicesRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/services"),
        ]);

        if (!dashboardRes.ok || !servicesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const dashboardData = await dashboardRes.json();
        const servicesData = await servicesRes.json();

        setKpi(dashboardData.kpi);
        setServices(servicesData.services);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getLastUpdateTime = () => {
    if (services.length === 0) return "Never";
    const lastCheck = services.reduce((latest, service) => {
      if (!service.lastHeartbeatAt) return latest;
      const serviceTime = new Date(service.lastHeartbeatAt).getTime();
      const latestTime = latest ? new Date(latest).getTime() : 0;
      return serviceTime > latestTime ? service.lastHeartbeatAt : latest;
    }, null as string | null);

    if (!lastCheck) return "Never";
    const date = new Date(lastCheck);
    return date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const systemStatus =
    services.length === 0
      ? "NO_DATA"
      : services.every((s) => s.status === "OPERATIONAL")
        ? "SYSTEM_OPTIMAL"
        : "DEGRADATION_DETECTED";

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* OS Header Area */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">Control_Plane_Overview</h2>
          </div>
          <p className="text-[10px] text-foreground/50 font-bold uppercase tracking-widest ml-5">
            Active Infrastructure Monitoring • Status:{" "}
            <span className={systemStatus === "SYSTEM_OPTIMAL" ? "text-success/80 font-black" : systemStatus === "NO_DATA" ? "text-warning/80 font-black" : "text-error/80 font-black"}>
              {systemStatus === "SYSTEM_OPTIMAL" && "SYSTEM_OPTIMAL"}
              {systemStatus === "NO_DATA" && "NO_SERVICES"}
              {systemStatus === "DEGRADATION_DETECTED" && "DEGRADATION_DETECTED"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Last_Update</div>
            <div className="text-[10px] font-bold text-foreground/60 tabular-nums uppercase">{getLastUpdateTime()}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-8 px-4 bg-accent text-black rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 active:scale-[0.98] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(167,139,250,0.1)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Monitor_New_Service
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-error" />
          <div>
            <p className="text-[10px] font-bold text-error uppercase">Data Fetch Error</p>
            <p className="text-[9px] text-error/60">{error}</p>
          </div>
        </div>
      )}

      {/* Main OS Content Grid */}
      <div className="border border-border rounded-sm overflow-hidden bg-background">
        <KPICards kpi={kpi} loading={loading} />
        <div className="p-8 border-b border-border">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">System_Health_Telemetry</h3>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-foreground/50 tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" /> Services_Status
              </span>
            </div>
          </div>
          <AnalyticsCharts services={services} loading={loading} />
        </div>
        <ServiceTable services={services} loading={loading} />
      </div>

      {/* Footer / System Status Bar */}
      {!loading && (
        <div className="mt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-6 text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em]">
            <span>
              Service_Uptime:{" "}
              <span className="text-success/60 tabular-nums">{kpi?.totalUptimePercent.toFixed(2) ?? "0"}%</span>
            </span>
            <span>
              Active_Monitors:{" "}
              <span className="text-foreground/60 tabular-nums">{kpi?.activeServices ?? 0}</span>
            </span>
            <span>
              Open_Incidents:{" "}
              <span className={kpi?.activeIncidents ? "text-error/60 tabular-nums font-black" : "text-foreground/60 tabular-nums"}>
                {String(kpi?.activeIncidents ?? 0).padStart(2, "0")}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                systemStatus === "SYSTEM_OPTIMAL"
                  ? "bg-success"
                  : systemStatus === "NO_DATA"
                    ? "bg-warning"
                    : "bg-error"
              }`}
            />
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${
              systemStatus === "SYSTEM_OPTIMAL"
                ? "text-success/60"
                : systemStatus === "NO_DATA"
                  ? "text-warning/60"
                  : "text-error/60"
            }`}>
              {systemStatus === "SYSTEM_OPTIMAL" && "Operational_State: Verified"}
              {systemStatus === "NO_DATA" && "Operational_State: No_Data"}
              {systemStatus === "DEGRADATION_DETECTED" && "Operational_State: Degraded"}
            </span>
          </div>
        </div>
      )}

      <AddMonitorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
