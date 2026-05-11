"use client";

import { KPICards } from "@/components/dashboard/KPICards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { ServiceTable } from "@/components/dashboard/ServiceTable";
import { Terminal, Plus } from "lucide-react";
import { useState } from "react";
import { AddMonitorModal } from "@/components/dashboard/AddMonitorModal";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            Active Infrastructure Monitoring • Status: <span className="text-success/80 font-black">SYSTEM_OPTIMAL</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em]">Last_Update</div>
            <div className="text-[10px] font-bold text-foreground/60 tabular-nums uppercase">2026-05-07 // 14:32:01</div>
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

      {/* Main OS Content Grid */}
      <div className="border border-border rounded-sm overflow-hidden bg-background">
        <KPICards />
        <div className="p-8 border-b border-border">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">System_Health_Telemetry</h3>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-foreground/50 tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" /> Network_Latency (Global)
              </span>
            </div>
          </div>
          <AnalyticsCharts />
        </div>
        <ServiceTable />
      </div>

      {/* Footer / System Status Bar */}
      <div className="mt-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-6 text-[9px] font-bold text-foreground/40 uppercase tracking-[0.2em]">
          <span>Service_Uptime: <span className="text-success/60 tabular-nums">99.98%</span></span>
          <span>Active_Monitors: <span className="text-foreground/60 tabular-nums">24</span></span>
          <span>Open_Incidents: <span className="text-foreground/60 tabular-nums">00</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success rounded-full" />
          <span className="text-[9px] font-black text-success/60 uppercase tracking-[0.2em]">Operational_State: Verified</span>
        </div>
      </div>

      <AddMonitorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
