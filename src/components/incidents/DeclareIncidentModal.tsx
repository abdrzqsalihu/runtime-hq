"use client";

import { useState, useEffect, useId } from "react";
import { X, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { useDialog } from "@/lib/use-dialog";
import { apiErrorMessage } from "@/lib/api-error";

interface Service {
  id: string;
  name: string;
  slug: string;
}

const SEVERITIES = ["LOW", "MEDIUM", "CRITICAL"] as const;

export function DeclareIncidentModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const titleId = useId();
  const dialogRef = useDialog<HTMLDivElement>(isOpen, () => {
    if (!loading) onClose();
  });
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<typeof SEVERITIES[number]>("MEDIUM");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setTitle("");
    setSeverity("MEDIUM");
    setMessage("");
    setSelectedServices([]);
    setError(null);
    setSuccess(false);
    setTitleError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const response = await fetch("/api/services");
        if (response.ok) {
          const data = await response.json();
          setServices(data.services || []);
        }
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [isOpen]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        setTitleError("Title is required");
        return;
      }
      setTitleError(null);
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          severity,
          serviceIds: selectedServices.length > 0 ? selectedServices : undefined,
          message: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMsg = apiErrorMessage(data, "Failed to create incident");
        setError(errorMsg);
        toast.error("INCIDENT_CREATION_FAILED", errorMsg);
        return;
      }

      setSuccess(true);
      toast.success("INCIDENT_CREATED", `"${title.trim()}" has been declared.`);
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create incident";
      setError(errorMsg);
      toast.error("INCIDENT_CREATION_FAILED", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-background border border-border rounded-sm w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id={titleId} className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">
            DECLARE_CRITICAL_EVENT
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-foreground/40 hover:text-foreground/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle className="w-8 h-8 text-success" />
              <p className="text-[10px] font-bold text-foreground/60 uppercase">
                INCIDENT DECLARED
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 border border-error/20 bg-error/5 rounded-sm flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-error/60">{error}</p>
                </div>
              )}

              {step === 1 ? (
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-2">
                      Incident Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (e.target.value.trim()) setTitleError(null);
                      }}
                      placeholder="e.g., Database connection pool exhaustion"
                      aria-label="Incident title"
                      className={cn(
                        "w-full px-3 py-2 bg-foreground/[0.02] border rounded-sm text-[10px] font-bold uppercase tracking-widest",
                        "focus:outline-none focus:border-accent",
                        titleError
                          ? "border-error/40 focus:border-error"
                          : "border-border"
                      )}
                    />
                    {titleError && (
                      <p className="text-[8px] text-error mt-1">{titleError}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-3">
                      Severity
                    </label>
                    <div className="flex gap-2">
                      {SEVERITIES.map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setSeverity(sev)}
                          className={cn(
                            "px-3 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all",
                            severity === sev
                              ? sev === "CRITICAL"
                                ? "bg-error text-white"
                                : sev === "MEDIUM"
                                ? "bg-warning text-black"
                                : "bg-success text-black"
                              : "bg-foreground/[0.05] text-foreground/40 border border-border"
                          )}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-3">
                      Affected Services
                    </label>
                    {loadingServices ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-4 h-4 animate-spin text-accent" />
                      </div>
                    ) : services.length === 0 ? (
                      <p className="text-[9px] text-foreground/30 p-4 border border-dashed border-border rounded-sm">
                        No services available
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {services.map((service) => (
                          <label
                            key={service.id}
                            className="flex items-center gap-3 p-2 border border-border rounded-sm hover:bg-foreground/[0.02] transition-all cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServices([
                                    ...selectedServices,
                                    service.id,
                                  ]);
                                } else {
                                  setSelectedServices(
                                    selectedServices.filter(
                                      (id) => id !== service.id
                                    )
                                  );
                                }
                              }}
                              className="w-4 h-4 accent-accent"
                            />
                            <span className="text-[9px] font-bold text-foreground/70 flex-1">
                              {service.name}
                            </span>
                            <span className="text-[8px] text-foreground/30">
                              {service.slug}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 block mb-2">
                      Initial Notes (Optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What do we know so far?"
                      aria-label="Initial notes"
                      className="w-full px-3 py-2 bg-foreground/[0.02] border border-border rounded-sm text-[9px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent"
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between p-6 border-t border-border">
            <div className="text-[8px] text-foreground/30 uppercase font-bold">
              Step {step} of 2
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground/60 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              {step === 1 ? (
                <button
                  onClick={handleNextStep}
                  disabled={loading || !title.trim()}
                  className="px-4 py-2 bg-accent text-black rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all disabled:opacity-50"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={cn(
                    "px-4 py-2 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    loading
                      ? "bg-foreground/10 text-foreground/40"
                      : "bg-error text-white hover:bg-error/90"
                  )}
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? "DECLARING..." : "DECLARE"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
