"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

interface IncidentEvent {
  id: string;
  message: string;
  timestamp: string;
  severity: "LOW" | "MEDIUM" | "CRITICAL" | null;
  region: string | null;
}

interface Service {
  name: string;
  slug: string;
}

interface Incident {
  id: string;
  title: string;
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  startedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  services: Array<{ service: Service }>;
  events: IncidentEvent[];
}

const STATUS_PROGRESSION = [
  "INVESTIGATING",
  "IDENTIFIED",
  "MONITORING",
  "RESOLVED",
] as const;

export default function IncidentDetailPage() {
  const toast = useToast();
  const { id } = useParams();
  const router = useRouter();
  const incidentId = Array.isArray(id) ? id[0] : id;

  const [incident, setIncident] = useState<Incident | null>(null);

  // Detect if incident is auto-detected (first event mentions "Outage detected")
  const isAutoDetected = incident &&
    incident.events.length > 0 &&
    incident.events[incident.events.length - 1]?.message.includes("Outage detected");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [newEventMessage, setNewEventMessage] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/incidents/${incidentId}`);
      if (!response.ok) {
        throw new Error(
          response.status === 404 ? "Incident not found" : "Failed to fetch incident"
        );
      }
      const data = await response.json();
      setIncident(data.incident);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (incidentId) {
      fetchIncident();
    }
  }, [incidentId]);

  const handleStatusUpdate = async (newStatus: typeof STATUS_PROGRESSION[number]) => {
    if (!incident) return;

    try {
      setUpdating(true);
      setUpdateError(null);

      if (newStatus === "RESOLVED") {
        const response = await fetch(`/api/incidents/${incidentId}/resolve`, {
          method: "POST",
        });
        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.message || "Failed to resolve incident";
          setUpdateError(errorMsg);
          toast.error("STATUS_UPDATE_FAILED", errorMsg);
          return;
        }
        const data = await response.json();
        setIncident(data.incident);
        toast.success("INCIDENT_RESOLVED", "The incident has been marked as resolved.");
      } else {
        const response = await fetch(`/api/incidents/${incidentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.message || "Failed to update incident";
          setUpdateError(errorMsg);
          toast.error("STATUS_UPDATE_FAILED", errorMsg);
          return;
        }
        const data = await response.json();
        setIncident(data.incident);
        toast.success("STATUS_UPDATED", `Incident is now ${newStatus.toLowerCase()}.`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to update incident";
      setUpdateError(errorMsg);
      toast.error("STATUS_UPDATE_FAILED", errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddEvent = async () => {
    if (!incident || !newEventMessage.trim()) return;

    try {
      setAddingEvent(true);

      const response = await fetch(`/api/incidents/${incidentId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newEventMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorMsg = "Failed to add event";
        toast.error("EVENT_ADD_FAILED", errorMsg);
        throw new Error(errorMsg);
      }

      setNewEventMessage("");
      toast.success("UPDATE_ADDED", "Your update has been recorded.");
      await fetchIncident();
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setAddingEvent(false);
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
            href="/incidents"
            className="p-2 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all text-foreground/20 hover:text-accent inline-flex"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="w-8 h-8 text-error" />
          <p className="text-foreground/60">{error}</p>
          <Link
            href="/incidents"
            className="px-4 py-2 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest text-foreground/30 hover:text-accent hover:border-accent/40 transition-all"
          >
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  if (!incident) return null;

  const currentStatusIndex = STATUS_PROGRESSION.indexOf(incident.status);
  const nextStatuses = STATUS_PROGRESSION.slice(
    currentStatusIndex + 1
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/incidents"
            className="p-2 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all text-foreground/20 hover:text-accent"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-foreground/90 tracking-tighter uppercase">
                {incident.title}
              </h2>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-0.5 rounded-sm border text-[9px] font-black uppercase tracking-widest",
                  incident.severity === "CRITICAL"
                    ? "text-error border-error/20 bg-error/5"
                    : incident.severity === "MEDIUM"
                    ? "text-warning border-warning/20 bg-warning/5"
                    : "text-success border-success/20 bg-success/5"
                )}
              >
                <div className={cn("w-1 h-1 rounded-full",
                  incident.severity === "CRITICAL" ? "bg-error" : incident.severity === "MEDIUM" ? "bg-warning" : "bg-success"
                )} />
                {incident.severity}
              </div>
            </div>
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-[0.2em] mt-1">
              ID: {incident.id} • Status: {incident.status}
            </p>
          </div>
        </div>
      </div>

      {updateError && (
        <div className="mb-6 p-4 border border-error/20 bg-error/5 rounded-sm flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <p className="text-[9px] text-error/60">{updateError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-border border border-border rounded-sm overflow-hidden">
        {/* Main content */}
        <div className="lg:col-span-3 bg-background p-8">
          {/* Timeline Events */}
          <div className="mb-8">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80 mb-6">
              Event Timeline
            </h3>

            {incident.events.length === 0 ? (
              <div className="flex items-center justify-center py-12 border border-dashed border-border rounded-sm">
                <p className="text-[10px] text-foreground/30 uppercase font-bold">
                  NO_EVENTS_RECORDED
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {incident.events.map((event) => (
                  <div key={event.id} className="p-3 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[9px] font-bold text-foreground/70">
                        {event.message}
                      </span>
                      <span className="text-[8px] text-foreground/30 whitespace-nowrap">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    {event.region && (
                      <div className="text-[8px] text-foreground/20">
                        Region: {event.region}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Event */}
          {incident.status !== "RESOLVED" && (
            <div className="border-t border-border pt-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/80 mb-4">
                Add Update
              </h3>
              <div className="flex gap-2">
                <textarea
                  value={newEventMessage}
                  onChange={(e) => setNewEventMessage(e.target.value)}
                  placeholder="What's the latest status?"
                  className="flex-1 px-3 py-2 bg-foreground/[0.02] border border-border rounded-sm text-[9px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent"
                  rows={2}
                />
                <button
                  onClick={handleAddEvent}
                  disabled={addingEvent || !newEventMessage.trim()}
                  className={cn(
                    "px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 h-fit",
                    addingEvent || !newEventMessage.trim()
                      ? "bg-foreground/10 text-foreground/40"
                      : "bg-accent text-black hover:bg-accent/80"
                  )}
                >
                  {addingEvent && <Loader2 className="w-3 h-3 animate-spin" />}
                  {addingEvent ? "ADDING..." : "ADD"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="bg-foreground/[0.01] flex flex-col">
          <div className="p-6 border-b border-border">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
              Incident Info
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Status */}
            <div>
              <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-3">
                Current Status
              </div>
              <div className="text-[10px] font-bold text-foreground/70 mb-3">
                {incident.status}
              </div>
              {isAutoDetected && (
                <p className="text-[8px] text-foreground/30 mb-3">
                  Auto-detected • Status updates are optional
                </p>
              )}
              {incident.status !== "RESOLVED" && (
                <div className="space-y-1">
                  {nextStatuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusUpdate(status)}
                      disabled={updating}
                      className="w-full text-left px-2 py-1.5 border border-border rounded-sm text-[8px] font-black uppercase tracking-widest text-foreground/40 hover:text-accent hover:border-accent/40 transition-all disabled:opacity-50"
                    >
                      → {status}
                    </button>
                  ))}
                  <button
                    onClick={() => handleStatusUpdate("RESOLVED")}
                    disabled={updating}
                    className="w-full text-left px-2 py-1.5 border border-error/20 rounded-sm text-[8px] font-black uppercase tracking-widest text-error bg-error/5 hover:border-error/40 transition-all disabled:opacity-50"
                  >
                    {isAutoDetected ? "🔴 MANUAL RESOLVE" : "🔴 RESOLVE"}
                  </button>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="border-t border-border pt-4">
              <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-2">
                Timing
              </div>
              <div className="space-y-1 text-[9px] text-foreground/40">
                <div>Started: {formatTime(incident.startedAt)}</div>
                {incident.resolvedAt && (
                  <div>Resolved: {formatTime(incident.resolvedAt)}</div>
                )}
                <div>Duration: {formatDuration(incident.startedAt, incident.resolvedAt)}</div>
              </div>
            </div>

            {/* Affected Services */}
            {incident.services.length > 0 && (
              <div className="border-t border-border pt-4">
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-3">
                  Affected Services
                </div>
                <div className="space-y-1">
                  {incident.services.map((link) => (
                    <Link
                      key={link.service.slug}
                      href={`/services/${link.service.slug}`}
                      className="block p-2 border border-border rounded-sm text-[8px] font-bold text-accent hover:bg-accent/5 transition-all"
                    >
                      {link.service.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ID */}
            <div className="border-t border-border pt-4">
              <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-1">
                ID
              </div>
              <div className="text-[8px] text-foreground/40 font-mono break-all">
                {incident.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
