/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import { useState } from "react";
import { Search, Plus, ExternalLink, Activity, Shield, Cpu, Mail, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const groups = ["ALL_RESOURCES", "CORE_INFRA", "API_NODES", "MESSAGING_BUS"];

const services = [
  {
    id: "STRIPE",
    name: "STRIPE_API_GATEWAY",
    category: "API_NODES",
    status: "Operational",
    endpoint: "api.stripe.com/v1",
    region: "US_EAST_1",
    uptime: "99.99%",
    icon: Shield,
    tags: ["PAYMENTS", "EXTERNAL"],
  },
  {
    id: "AWS",
    name: "AWS_US_EAST_CLUSTER",
    category: "CORE_INFRA",
    status: "Degraded",
    endpoint: "ec2.us-east-1.aws",
    region: "US_EAST",
    uptime: "99.85%",
    icon: Cpu,
    tags: ["VPC", "INTERNAL"],
  },
  {
    id: "GITHUB",
    name: "GITHUB_RUNNER_MESH",
    category: "CORE_INFRA",
    status: "Operational",
    endpoint: "api.github.com",
    region: "GLOBAL",
    uptime: "100%",
    icon: Activity,
    tags: ["CI_CD", "EXTERNAL"],
  },
  {
    id: "SENDGRID",
    name: "SENDGRID_SMTP_BUS",
    category: "MESSAGING_BUS",
    status: "Outage",
    endpoint: "smtp.sendgrid.net",
    region: "GLOBAL",
    uptime: "98.2%",
    icon: Mail,
    tags: ["EMAIL", "EXTERNAL"],
  },
];

export default function ServicesPage() {
  const [activeGroup, setActiveGroup] = useState("ALL_RESOURCES");

  return (
    <div className="max-w-[1600px] mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Box className="w-3.5 h-3.5 text-accent" />
            <h2 className="text-[11px] font-black text-foreground/90 tracking-[0.2em] uppercase">Service_Registry_Catalog</h2>
          </div>
          <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest ml-5">Configure and provision distributed infrastructure nodes</p>
        </div>
        <button className="flex items-center gap-2 bg-accent text-black px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all">
          <Plus className="w-3.5 h-3.5" />
          PROVISION_NEW_NODE
        </button>
      </div>

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-1 p-0.5 bg-foreground/[0.02] border border-border rounded-sm">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={cn(
                "px-3 py-1.5 rounded-sm text-[9px] font-black uppercase tracking-widest transition-all",
                activeGroup === group
                  ? "bg-accent text-black"
                  : "text-foreground/40 hover:text-foreground/80 hover:bg-foreground/[0.02]"
              )}
            >
              {group}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20" />
          <input
            type="text"
            placeholder="FILTER_CATALOG..."
            className="pl-9 pr-4 py-2 bg-foreground/[0.02] border border-border rounded-sm text-[9px] font-bold uppercase tracking-widest w-64 focus:outline-none focus:border-accent/40 placeholder:text-foreground/10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-border border border-border rounded-sm overflow-hidden">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-background p-5 group hover:bg-foreground/[0.01] transition-all flex items-center gap-8 relative"
          >
            <div className="w-10 h-10 rounded-sm bg-foreground/[0.03] border border-border flex items-center justify-center text-foreground/20 group-hover:text-accent group-hover:border-accent/30 transition-all">
              <service.icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-black text-foreground/90 uppercase tracking-tight group-hover:text-accent transition-colors">{service.name}</h3>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm bg-foreground/[0.05] text-foreground/30 border border-border/50">
                  {service.category}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-[9px] font-bold text-foreground/20 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3" />
                  {service.endpoint}
                </span>
                <span>//</span>
                <span>{service.region}</span>
              </div>
            </div>

            <div className="flex gap-1.5">
              {service.tags.map(tag => (
                <span key={tag} className="text-[8px] font-bold text-foreground/20 border border-border px-1.5 py-0.5 rounded-sm">
                  {tag}
                </span>
              ))}
            </div>

            <div className="w-32">
              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-foreground/10 mb-1.5">State</div>
              <div className={cn(
                "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                service.status === "Operational" ? "text-success/60" :
                  service.status === "Degraded" ? "text-warning/60" : "text-error/60"
              )}>
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  service.status === "Operational" ? "bg-success" :
                    service.status === "Degraded" ? "bg-warning" : "bg-error"
                )} />
                {service.status}
              </div>
            </div>

            <div className="w-48">
              <div className="text-[8px] font-black uppercase tracking-[0.3em] text-foreground/10 mb-2">Uptime_Streak</div>
              <div className="flex gap-[1px] h-3">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-[1px]",
                      i === 28 ? "bg-error/40" : i === 15 ? "bg-warning/40" : "bg-success/20"
                    )}
                  />
                ))}
              </div>
            </div>

            <Link
              href={`/services/${service.id.toLowerCase()}`}
              className="px-4 py-2 border border-border rounded-sm text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all"
            >
              INSPECT_NODE
            </Link>

            {/* Accent hover line */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
}
