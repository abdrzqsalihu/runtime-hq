"use client";

import React, { useState } from "react";
import { X, Globe, Shield, Clock, Terminal, Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddMonitorModal({ isOpen, onClose }: AddMonitorModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    region: "GLOBAL_EDGE",
    interval: "30s",
    type: "HTTP_GET",
    expectedStatus: "200",
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
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

          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">Service_Identity</label>
                  <input
                    type="text"
                    placeholder="e.g. STRIPE_API_GATEWAY"
                    className="w-full bg-foreground/[0.03] border border-border rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">Endpoint_URL</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
                    <input
                      type="text"
                      placeholder="https://api.example.com/v1/health"
                      className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3 text-[10px] font-bold tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">Region_Node</label>
                    <select
                      className="w-full bg-foreground/[0.03] border border-border rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground cursor-pointer [&>option]:bg-surface [&>option]:text-foreground"
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    >
                      <option value="GLOBAL_EDGE">Global Edge</option>
                      <option value="US_EAST_1">US East 1</option>
                      <option value="EU_WEST_1">EU West 1</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">Check_Interval</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40" />
                      <select
                        className="w-full bg-foreground/[0.03] border border-border rounded-sm pl-11 pr-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground cursor-pointer [&>option]:bg-surface [&>option]:text-foreground"
                        value={formData.interval}
                        onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                      >
                        <option value="30s">30 Seconds</option>
                        <option value="60s">60 Seconds</option>
                        <option value="5m">5 Minutes</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-foreground/60 ml-1">Expected_Response_Code</label>
                  <input
                    type="text"
                    placeholder="200"
                    className="w-full bg-foreground/[0.03] border border-border rounded-sm px-4 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all text-foreground"
                    value={formData.expectedStatus}
                    onChange={(e) => setFormData({ ...formData, expectedStatus: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-6 border border-dashed border-border rounded-sm bg-foreground/[0.01] flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-accent animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">Configuration_Verified</h4>
                    <p className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">Ready to deploy monitor to global nodes</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-2">
                  <div>
                    <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Service</div>
                    <div className="text-[10px] font-bold text-foreground/60 uppercase">{formData.name || "UNNAMED_NODE"}</div>
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Region</div>
                    <div className="text-[10px] font-bold text-foreground/60 uppercase">{formData.region}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[8px] font-black text-foreground/30 uppercase tracking-widest mb-1">Endpoint</div>
                    <div className="text-[10px] font-bold text-foreground/60 truncate">{formData.url || "NULL_ENDPOINT"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-border bg-foreground/[0.01] flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:text-foreground/80 transition-colors cursor-pointer"
          >
            {step === 1 ? "CANCEL_PROVISION" : "PREVIOUS_STEP"}
          </button>
          <button
            onClick={() => step < 3 ? setStep(step + 1) : onClose()}
            className="px-6 py-2.5 bg-accent text-black rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {step === 3 ? (
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
