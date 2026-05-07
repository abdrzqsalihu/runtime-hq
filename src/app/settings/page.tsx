"use client";

import {
  Key,
  Shield,
  Cpu,
  Terminal,
  Copy,
  Plus,
  Moon,
  Sun,
  Globe
} from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-3.5 h-3.5 text-accent" />
          <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">System_Config_Layer</h2>
        </div>
        <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">Global environment parameters & security keys</p>
      </div>

      <div className="space-y-4">
        {/* Appearance Section */}
        <div className="surface border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-foreground/[0.01] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="w-3.5 h-3.5 text-accent" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Interface_Visualization</h3>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight">Theme_Mode</div>
              <p className="text-[9px] text-foreground/30 font-bold uppercase mt-1 tracking-widest">Switch between dark/light kernel themes</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-black hover:border-accent transition-all"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === "dark" ? "Set_Light_Mode" : "Set_Dark_Mode"}
            </button>
          </div>
        </div>

        {/* API Section */}
        <div className="surface border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-foreground/[0.01] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-3.5 h-3.5 text-warning" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Secure_Access_Tokens</h3>
            </div>
            <button className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-all">
              <Plus className="w-3.5 h-3.5" />
              GENERATE_TOKEN
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {[
              { name: "PRODUCTION_MASTER", token: "PULSE_LIVE_••••••••••••••••", created: "2026-04-12" },
              { name: "SANDBOX_NODE_01", token: "PULSE_TEST_••••••••••••••••", created: "2026-03-28" },
            ].map((key) => (
              <div key={key.name} className="p-5 flex items-center justify-between group hover:bg-foreground/[0.005] transition-colors">
                <div>
                  <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight group-hover:text-accent transition-colors">{key.name}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="text-[9px] font-mono text-foreground/30 bg-foreground/[0.02] px-2 py-0.5 rounded-sm border border-border/50">
                      {key.token}
                    </code>
                    <button className="text-foreground/10 hover:text-foreground/40 transition-colors">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-[8px] font-black uppercase tracking-widest text-foreground/10 text-right">
                  DEPLOID: {key.created}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Region Config */}
        <div className="surface border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-foreground/[0.01]">
            <div className="flex items-center gap-3">
              <Globe className="w-3.5 h-3.5 text-accent" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Regional_Cluster_Config</h3>
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 gap-8">
            <div>
              <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight mb-4">Active_Nodes</div>
              <div className="space-y-2">
                {["US_EAST_1", "EU_CENTRAL_1", "AP_SOUTH_1"].map(region => (
                  <div key={region} className="flex items-center justify-between p-2 border border-border/50 rounded-sm text-[9px] font-bold text-foreground/40">
                    <span>{region}</span>
                    <div className="w-1.5 h-1.5 bg-success rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-foreground/80 uppercase tracking-tight mb-4">Failover_Strategy</div>
              <select className="w-full bg-background border border-border rounded-sm p-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 focus:border-accent/40 focus:outline-none">
                <option>AUTOMATIC_FAILOVER</option>
                <option>MANUAL_INTERVENTION</option>
                <option>STRICT_NODE_ISOLATION</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="surface border border-error/20 rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-error/10 bg-error/[0.02]">
            <div className="flex items-center gap-3">
              <Shield className="w-3.5 h-3.5 text-error" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-error">System_Termination_Zone</h3>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-error uppercase tracking-tight">Purge_Kernel_Logs</div>
              <p className="text-[9px] text-error/40 font-bold uppercase mt-1 tracking-widest leading-relaxed">
                Irreversible deletion of all historical system signals <br /> and incident records.
              </p>
            </div>
            <button className="px-4 py-2 border border-error/20 text-error rounded-sm text-[9px] font-black uppercase tracking-widest hover:bg-error/10 transition-all">
              EXEC_FACTORY_RESET
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
