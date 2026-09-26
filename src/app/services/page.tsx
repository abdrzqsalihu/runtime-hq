/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import { useState, useEffect } from "react";
import { Search, Plus, ExternalLink, Activity, Shield, Cpu, Mail, Box, AlertCircle, Loader2, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AddMonitorModal } from "@/components/dashboard/AddMonitorModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useToast } from "@/lib/use-toast";
import { apiErrorMessage } from "@/lib/api-error";

const groups = ["ALL_RESOURCES", "CORE_INFRA", "API_NODES", "MESSAGING_BUS", "THIRD_PARTY_APIS"];

interface ServiceCheck {
  id: string;
  checkedAt: string;
  status: "OPERATIONAL" | "DEGRADED" | "OUTAGE";
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
  uptime24h: number | null;
  checks24h: number;
  checks: ServiceCheck[];
}

const categoryIcons: Record<string, LucideIcon> = {
  API_NODES: Shield,
  CORE_INFRA: Cpu,
  MESSAGING_BUS: Mail,
  THIRD_PARTY_APIS: Activity,
};

export default function ServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState("ALL_RESOURCES");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/services");
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }
      const data = await response.json();
      setServices(data.services);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchServices();
    });
  }, []);

  // Filter services based on group and search
  const filteredServices = services.filter((service) => {
    const matchesGroup = activeGroup === "ALL_RESOURCES" || service.category === activeGroup;
    const matchesSearch =
      !searchQuery ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.endpointUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleMonitorCreated = () => {
    fetchServices();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/services/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(apiErrorMessage(data, "Failed to delete service"));
      }
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success("SERVICE_DELETED", "Service deleted.");
    } catch (err) {
      toast.error(
        "DELETE_FAILED",
        err instanceof Error ? err.message : "Failed to delete service"
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Box className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">Service_Registry_Catalog</h2>
          </div>
          <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">
            {loading ? "Loading services..." : `${filteredServices.length} of ${services.length} service${services.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-accent text-black px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          PROVISION_NEW_NODE
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-error" />
          <p className="text-[10px] font-bold text-error uppercase">Error: {error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-1 p-0.5 bg-foreground/[0.02] border border-border rounded-sm overflow-x-auto max-w-full">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeGroup === group
                  ? "bg-accent text-black"
                  : "text-foreground/40 hover:text-foreground/80 hover:bg-foreground/[0.02]"
              )}
            >
              {group}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
          <input
            type="text"
            placeholder="FILTER_CATALOG..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-foreground/[0.02] border border-border rounded-sm text-[9px] font-bold uppercase tracking-widest w-full sm:w-64 focus:outline-none focus:border-accent/40 placeholder:text-foreground/10"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-6 h-6 text-warning" />
          <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">No services match your filter</p>
          <p className="text-[9px] text-foreground/30">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-border border border-border rounded-sm overflow-hidden">
          {filteredServices.map((service) => {
            const IconComponent = categoryIcons[service.category] || Activity;
            const uptime = service.uptime24h !== null ? service.uptime24h.toFixed(2) : null;

            // If no checks yet, show AWAITING_CHECK instead of database status
            const displayStatus = service.checks.length === 0 ? "AWAITING_CHECK" : service.status;

            const statusMapping = {
              OPERATIONAL: "Operational",
              DEGRADED: "Degraded",
              OUTAGE: "Outage",
              AWAITING_CHECK: "Awaiting Check",
            };
            const statusColors = {
              OPERATIONAL: "text-success/60",
              DEGRADED: "text-warning/60",
              OUTAGE: "text-error/60",
              AWAITING_CHECK: "text-foreground/40",
            };
            const statusBgColors = {
              OPERATIONAL: "bg-success",
              DEGRADED: "bg-warning",
              OUTAGE: "bg-error",
              AWAITING_CHECK: "bg-foreground/20",
            };

            return (
              <div
                key={service.id}
                className="bg-background p-4 sm:p-5 group hover:bg-foreground/[0.01] transition-all flex flex-col gap-4 min-[1180px]:flex-row min-[1180px]:items-center min-[1180px]:gap-8 relative"
              >
                <div className="w-10 h-10 rounded-sm bg-foreground/[0.03] border border-border flex items-center justify-center text-foreground/20 group-hover:text-accent group-hover:border-accent/30 transition-all">
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-xs font-black text-foreground/90 uppercase tracking-tight group-hover:text-accent transition-colors">{service.name}</h3>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm bg-foreground/[0.05] text-foreground/30 border border-border/50">
                      {service.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-[9px] font-bold text-foreground/20 uppercase tracking-widest min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{service.endpointUrl.replace(/https?:\/\//, "")}</span>
                    </span>
                  </div>
                </div>

                <div className="w-full min-[1180px]:w-32">
                  <div className="text-[8px] font-black uppercase tracking-[0.3em] text-foreground/10 mb-1.5">State</div>
                  <div className={cn("inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest", statusColors[displayStatus])}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", statusBgColors[displayStatus])} />
                    {statusMapping[displayStatus]}
                  </div>
                </div>

                <div className="w-full min-[1180px]:w-48">
                  <div className="text-[8px] font-black uppercase tracking-[0.3em] text-foreground/10 mb-2">Uptime · 24H</div>
                  {service.checks.length > 0 ? (
                    <div>
                      <div className="text-[10px] font-bold text-foreground/70 mb-1">{uptime !== null ? `${uptime}%` : "—"}</div>
                      <div role="img" aria-label={`${service.name}: last ${service.checks.length} checks, oldest to newest`} className="flex gap-[1px] h-2">
                        {[...service.checks].slice(0, 30).reverse().map((check, i) => (
                          <div
                            key={check.id || i}
                            className={cn(
                              "flex-1 rounded-[1px]",
                              check.status === "OPERATIONAL"
                                ? "bg-success/40"
                                : check.status === "DEGRADED"
                                  ? "bg-warning/40"
                                  : "bg-error/40"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold text-foreground/40">Awaiting_data</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/services/${service.slug}`}
                    className="px-4 py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all"
                  >
                    INSPECT_NODE
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(service)}
                    title="Delete service"
                    aria-label={`Delete ${service.name}`}
                    className="p-2 border border-border rounded-sm text-foreground/20 hover:text-error hover:border-error/40 hover:bg-error/5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Accent hover line */}
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}

      <AddMonitorModal isOpen={isModalOpen} onClose={handleModalClose} onSuccess={handleMonitorCreated} />

      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title={`Delete ${deleteTarget?.name ?? "Service"}?`}
        description="This will permanently remove this monitor and its check history. This action cannot be undone."
        confirmLabel="Delete Service"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
