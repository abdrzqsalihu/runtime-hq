"use client";

import React, { useMemo } from "react";
import { Cpu, Terminal, ShieldCheck, Globe, Activity } from "lucide-react";
import Link from "next/link";
import { cn, createSeededRng } from "@/lib/utils";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pulseData = useMemo(() => {
        const rng = createSeededRng("auth-pulse-telemetry");
        return Array.from({ length: 48 }, () => 20 + rng() * 80);
    }, []);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Left Panel: Operational Identity & Telemetry */}
            <div className="relative hidden w-[45%] flex-col border-r border-border bg-foreground/[0.01] lg:flex">
                {/* Branding */}
                <div className="p-10">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center transition-transform group-hover:scale-105">
                            <Cpu className="w-4.5 h-4.5 text-black" />
                        </div>
                        <span className="text-sm font-black tracking-[0.4em] uppercase text-foreground/90">RUNTIME HQ</span>
                    </Link>
                </div>

                {/* Ambient Telemetry Feed */}
                <div className="flex-1 px-10 overflow-hidden relative">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_center,var(--color-accent)_0,transparent_100%)]" />

                    <div className="space-y-12 mt-10 relative z-10">
                        {/* System Status Node */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5 text-accent" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Service_Status</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: "API Gateway", val: "OPERATIONAL", status: "success" },
                                    { label: "Database", val: "OPERATIONAL", status: "success" },
                                    { label: "Auth Service", val: "DEGRADED", status: "warning" },
                                    { label: "Cache Layer", val: "OPERATIONAL", status: "success" },
                                ].map((node) => (
                                    <div key={node.label} className="p-3 border border-border/40 rounded-sm bg-background/50 backdrop-blur-sm">
                                        <div className="text-[8px] font-black text-foreground/20 uppercase tracking-widest mb-1">{node.label}</div>
                                        <div className={cn(
                                            "text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                                            node.status === "success" ? "text-success/60" : "text-warning/60"
                                        )}>
                                            <div className={cn("w-1 h-1 rounded-full", node.status === "success" ? "bg-success" : "bg-warning")} />
                                            {node.val}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Signal Pulse */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-accent" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Health_Check_Activity</h3>
                            </div>
                            <div className="h-32 w-full border border-border/40 rounded-sm bg-background/50 backdrop-blur-sm p-4 flex items-end gap-[3px]">
                                {pulseData.map((height, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 bg-accent/20 rounded-t-[1px] animate-pulse"
                                        style={{
                                            height: `${height}%`,
                                            animationDelay: `${i * 0.05}s`,
                                            animationDuration: '2s'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Mission Statement */}
                        <div className="space-y-3">
                            <h2 className="text-xl font-black text-foreground/80 tracking-tighter leading-tight">
                                Keep an Eye on <br />
                                <span className="text-accent">Your Services.</span>
                            </h2>
                            <p className="text-[11px] font-medium text-foreground/40 leading-relaxed max-w-sm uppercase tracking-wide">
                                Monitor your applications and APIs. Runtime HQ checks them continuously and alerts you when something goes wrong.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Security Badge */}
                <div className="p-10 border-t border-border bg-foreground/[0.01]">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm border border-border flex items-center justify-center bg-background/50">
                            <ShieldCheck className="w-5 h-5 text-success/60" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-foreground/80 uppercase tracking-widest">Built_for_Developers</div>
                            <div className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest mt-0.5">Simple monitoring you can trust.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Auth Form */}
            <div className="relative flex flex-1 items-center justify-center p-6 lg:p-12 overflow-y-auto">
                {/* Subtle grid background for light mode depth */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] lg:opacity-[0.03]" />

                <div className="w-full max-w-[420px] relative z-10">
                    {children}
                </div>
            </div>
        </div>
    );
}
