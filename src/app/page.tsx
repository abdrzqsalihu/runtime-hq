import { KPICards } from "@/components/dashboard/KPICards";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { ServiceTable } from "@/components/dashboard/ServiceTable";
import { Cpu, Terminal, Zap } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="max-w-[1600px] mx-auto">
      {/* OS Header Area */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">RUNTIME HQ</h2>
          </div>
          <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">
            Distributed System Monitoring • Cluster: <span className="text-foreground/50">ALPHA_NODE_01</span>
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em]">Current_Clock</div>
            <div className="text-[10px] font-bold text-foreground/60 tabular-nums uppercase">2026-04-25 // 14:32:01</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm border border-border flex items-center justify-center bg-foreground/[0.02] hover:border-accent/40 transition-colors cursor-pointer">
              <Zap className="w-3.5 h-3.5 text-warning" />
            </div>
            <div className="w-8 h-8 rounded-sm border border-border flex items-center justify-center bg-foreground/[0.02] hover:border-accent/40 transition-colors cursor-pointer">
              <Cpu className="w-3.5 h-3.5 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Main OS Content Grid */}
      <div className="border border-border rounded-sm overflow-hidden bg-background">
        <KPICards />
        <AnalyticsCharts />
        <ServiceTable />
      </div>

      {/* Footer / System Status Bar */}
      <div className="mt-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-6 text-[9px] font-bold text-foreground/20 uppercase tracking-[0.2em]">
          <span>CPU: <span className="text-foreground/40 tabular-nums">12.4%</span></span>
          <span>MEM: <span className="text-foreground/40 tabular-nums">44.1GB</span></span>
          <span>NET: <span className="text-foreground/40 tabular-nums">1.2GB/s</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success rounded-full" />
          <span className="text-[9px] font-black text-success/40 uppercase tracking-[0.2em]">System_Operational_Healthy</span>
        </div>
      </div>
    </div>
  );
}
