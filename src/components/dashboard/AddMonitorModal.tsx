"use client";

import React, { useState } from "react";
import { X, Globe, Shield, Terminal, Activity, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddMonitorModal({ isOpen, onClose, onSuccess }: AddMonitorModalProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    region: "GLOBAL_EDGE",
    category: "API_NODES",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) onClose();
  };

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")                 // Replace spaces and underscores with hyphens
      .replace(/[^a-z0-9-]/g, "")              // Remove all other special characters
      .replace(/-+/g, "-")                     // Collapse multiple hyphens
      .replace(/^-+|-+$/g, "");                // Remove leading/trailing hyphens
  };

  // Validate step 1
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Service name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Service name must be at least 2 characters";
    } else if (formData.name.length > 128) {
      newErrors.name = "Service name must be less than 128 characters";
    }

    if (!formData.url.trim()) {
      newErrors.url = "Endpoint URL is required";
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = "Please enter a valid URL (e.g., https://api.example.com)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate step 2
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.region.trim()) {
      newErrors.region = "Region is required";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setErrors({});
    setStep(step + 1);
  };

  const handlePreviousStep = () => {
    setErrors({});
    setSubmitError(null);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);

    try {
      const slug = generateSlug(formData.name);

      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          name: formData.name,
          category: formData.category,
          endpointUrl: formData.url,
          region: formData.region,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to create service";

        // Handle specific errors
        if (response.status === 400) {
          if (errorData.issues) {
            const issue = errorData.issues[0];
            if (issue.path?.includes("slug")) {
              throw new Error("A monitor with this name already exists");
            }
          }
          throw new Error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
      toast.success("SERVICE_ADDED", "Monitoring has started.");

      // Wait a moment to show success message
      setTimeout(() => {
        // Reset form
        setFormData({
          name: "",
          url: "",
          region: "GLOBAL_EDGE",
          category: "API_NODES",
        });
        setStep(1);
        setSuccess(false);

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }

        onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setSubmitError(message);
      toast.error("SERVICE_CREATION_FAILED", message);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-lg bg-background border border-border rounded-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border bg-foreground/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/90">
              Provision_New_Monitor
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-foreground/5 rounded-sm transition-colors text-foreground/40 hover:text-foreground/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-6 h-6 rounded-sm border flex items-center justify-center text-[10px] font-black transition-all cursor-pointer",
                    step === i ? "bg-accent border-accent text-black" :
                      step > i ? "bg-success/20 border-success/40 text-success" : "bg-foreground/[0.02] border-border text-foreground/40"
                  )}
                  onClick={() => i < step && setStep(i)}
                >
                  {step > i ? <CheckCircle2 className="w-3.5 h-3.5" /> : `0${i}`}
                </div>
                {i < 3 && <div className="w-12 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="p-3 border border-error/20 bg-error/5 rounded-sm flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              <p className="text-[9px] font-bold text-error/80 uppercase tracking-widest">{submitError}</p>
            </div>
          )}

          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">
                    Service_Identity
                    <span className="text-error"> *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. STRIPE_API_GATEWAY"
                    className={cn(
                      "w-full bg-foreground/[0.03] border rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 transition-all text-foreground",
                      errors.name
                        ? "border-error focus:border-error focus:ring-error/20"
                        : "border-border focus:border-accent focus:ring-accent/20"
                    )}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                  />
                  {errors.name && <p className="text-[8px] text-error">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">
                    Endpoint_URL
                    <span className="text-error"> *</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
                    <input
                      type="text"
                      placeholder="https://api.example.com/v1/health"
                      className={cn(
                        "w-full bg-foreground/[0.03] border rounded-sm pl-11 pr-4 py-3 text-[10px] font-bold tracking-widest focus:outline-none focus:ring-1 transition-all text-foreground",
                        errors.url
                          ? "border-error focus:border-error focus:ring-error/20"
                          : "border-border focus:border-accent focus:ring-accent/20"
                      )}
                      value={formData.url}
                      onChange={(e) => {
                        setFormData({ ...formData, url: e.target.value });
                        if (errors.url) setErrors({ ...errors, url: "" });
                      }}
                    />
                  </div>
                  {errors.url && <p className="text-[8px] text-error">{errors.url}</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">
                      Region_Node
                      <span className="text-error"> *</span>
                    </label>
                    <select
                      className={cn(
                        "w-full bg-foreground/[0.03] border rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 transition-all text-foreground cursor-pointer [&>option]:bg-surface [&>option]:text-foreground",
                        errors.region
                          ? "border-error focus:border-error focus:ring-error/20"
                          : "border-border focus:border-accent focus:ring-accent/20"
                      )}
                      value={formData.region}
                      onChange={(e) => {
                        setFormData({ ...formData, region: e.target.value });
                        if (errors.region) setErrors({ ...errors, region: "" });
                      }}
                    >
                      <option value="">Select a region...</option>
                      <option value="GLOBAL_EDGE">Global Edge</option>
                      <option value="US_EAST_1">US East 1</option>
                      <option value="EU_WEST_1">EU West 1</option>
                      <option value="US_WEST_2">US West 2</option>
                      <option value="AP_SOUTH_1">Asia Pacific South</option>
                    </select>
                    {errors.region && <p className="text-[8px] text-error">{errors.region}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">
                      Service_Category
                      <span className="text-error"> *</span>
                    </label>
                    <select
                      className={cn(
                        "w-full bg-foreground/[0.03] border rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 transition-all text-foreground cursor-pointer [&>option]:bg-surface [&>option]:text-foreground",
                        errors.category
                          ? "border-error focus:border-error focus:ring-error/20"
                          : "border-border focus:border-accent focus:ring-accent/20"
                      )}
                      value={formData.category}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value });
                        if (errors.category) setErrors({ ...errors, category: "" });
                      }}
                    >
                      <option value="">Select a category...</option>
                      <option value="API_NODES">API Nodes</option>
                      <option value="CORE_INFRA">Core Infrastructure</option>
                      <option value="MESSAGING_BUS">Messaging Bus</option>
                      <option value="THIRD_PARTY_APIS">Third Party APIs</option>
                    </select>
                    {errors.category && <p className="text-[8px] text-error">{errors.category}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {success ? (
                  <div className="p-6 border border-success/20 bg-success/5 rounded-sm flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-success">Monitor_Created</h4>
                      <p className="text-[9px] font-bold text-success/60 uppercase tracking-widest">{formData.name}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border border-dashed border-border rounded-sm bg-foreground/[0.01] flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-accent animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Configuration_Verified</h4>
                        <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Ready to deploy monitor</p>
                      </div>
                    </div>
                    <div className="space-y-4 px-2">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        <div>
                          <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Service</div>
                          <div className="text-[10px] font-bold text-foreground/60 uppercase">{formData.name}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Region</div>
                          <div className="text-[10px] font-bold text-foreground/60 uppercase">{formData.region}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Category</div>
                          <div className="text-[10px] font-bold text-foreground/60 uppercase">{formData.category}</div>
                        </div>
                        <div>
                          <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Slug</div>
                          <div className="text-[10px] font-mono text-foreground/60">{generateSlug(formData.name)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Endpoint</div>
                        <div className="text-[10px] font-bold text-foreground/60 truncate break-all">{formData.url}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-border bg-foreground/[0.01] flex items-center justify-between">
          <button
            onClick={() => {
              if (loading || success) return;
              step > 1 ? handlePreviousStep() : onClose();
            }}
            disabled={loading || success}
            className="text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 1 ? "CANCEL_PROVISION" : "PREVIOUS_STEP"}
          </button>
          <button
            onClick={() => {
              if (step < 3) {
                handleNextStep();
              } else {
                handleSubmit();
              }
            }}
            disabled={loading || success}
            className="px-6 py-2.5 bg-accent text-black rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                DEPLOYING...
              </>
            ) : step === 3 ? (
              <>
                <Shield className="w-3.5 h-3.5" />
                DEPLOY_MONITOR
              </>
            ) : (
              "NEXT_CONFIGURATION"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
