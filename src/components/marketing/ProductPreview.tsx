import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeartbeatBar } from "./HeartbeatBar";

type PreviewStatus = "OPERATIONAL" | "DEGRADED" | "AWAITING_CHECK";

interface PreviewService {
  name: string;
  endpoint: string;
  status: PreviewStatus;
  latency: string;
  uptime: string;
  pattern: string;
}

const ok = (n: number) => "o".repeat(n);

// Sample data only. Semantics mirror the product: a service with no checks is
// "awaiting check", never "operational".
const SERVICES: PreviewService[] = [
  {
    name: "ORDERS_API",
    endpoint: "api.example.com/orders/health",
    status: "OPERATIONAL",
    latency: "118ms",
    uptime: "100.0%",
    pattern: ok(30),
  },
  {
    name: "AUTH_SERVICE",
    endpoint: "auth.example.com/health",
    status: "OPERATIONAL",
    latency: "96ms",
    uptime: "96.7%",
    pattern: ok(14) + "d" + ok(15),
  },
  {
    name: "CHECKOUT_API",
    endpoint: "checkout.example.com/ping",
    status: "OPERATIONAL",
    latency: "142ms",
    uptime: "100.0%",
    pattern: ok(30),
  },
  {
    name: "SEARCH_API",
    endpoint: "search.example.com/status",
    status: "DEGRADED",
    latency: "74ms",
    uptime: "83.3%",
    pattern: ok(25) + "ddddd",
  },
  {
    name: "NEW_SERVICE",
    endpoint: "new.example.com/health",
    status: "AWAITING_CHECK",
    latency: "—",
    uptime: "—",
    pattern: ".".repeat(30),
  },
];

const KPIS = [
  { label: "SYSTEM_UPTIME", value: "75.00%", dot: "bg-error" },
  { label: "SERVICES", value: "5", dot: "bg-success" },
  { label: "LATENCY_AVG", value: "108ms", dot: "bg-success" },
  { label: "OPEN_INCIDENTS", value: "01", dot: "bg-warning" },
];

const STATUS_STYLES: Record<PreviewStatus, { dot: string; text: string; label: string }> = {
  OPERATIONAL: { dot: "bg-success", text: "text-success/80", label: "Operational" },
  DEGRADED: { dot: "bg-warning", text: "text-warning/80", label: "Degraded" },
  AWAITING_CHECK: { dot: "bg-foreground/30", text: "text-foreground/40", label: "Awaiting check" },
};

export function ProductPreview() {
  return (
    <div
      className="overflow-hidden rounded-sm border border-border bg-surface"
      aria-label="Sample Runtime HQ control plane"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-foreground/80 sm:tracking-[0.2em]">
            Control_Plane_Overview
          </span>
        </div>
        <span className="shrink-0 rounded-sm border border-accent/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent">
          Sample data
        </span>
      </div>

      <div className="grid grid-cols-2 border-b border-border md:grid-cols-4">
        {KPIS.map((kpi, i) => (
          <div
            key={kpi.label}
            className={cn(
              "border-border p-4",
              i % 2 === 0 && "border-r",
              i < 2 && "border-b md:border-b-0",
              i < 3 && "md:border-r",
              i === 3 && "md:border-r-0",
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={cn("h-1.5 w-1.5 rounded-full", kpi.dot)} />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">
                {kpi.label}
              </span>
            </div>
            <div className="text-xl font-black tabular-nums tracking-tighter text-foreground/90">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden grid-cols-[minmax(0,1.1fr)_8rem_minmax(0,1.6fr)_4.5rem_4.5rem] gap-x-4 border-b border-border bg-foreground/[0.02] px-4 py-2 md:grid">
        {["Service", "Status", "Last 30 checks", "Latency", "Uptime"].map((heading) => (
          <span
            key={heading}
            className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40"
          >
            {heading}
          </span>
        ))}
      </div>

      <ul className="divide-y divide-border/60">
        {SERVICES.map((service) => {
          const style = STATUS_STYLES[service.status];
          return (
            <li
              key={service.name}
              className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.1fr)_8rem_minmax(0,1.6fr)_4.5rem_4.5rem]"
            >
              <div className="min-w-0">
                <div className="truncate text-[11px] font-black uppercase tracking-tight text-foreground/85">
                  {service.name}
                </div>
                <div className="truncate text-[9px] font-bold uppercase tracking-widest text-foreground/30">
                  {service.endpoint}
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest md:justify-start",
                  style.text,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                {style.label}
              </div>
              <HeartbeatBar
                pattern={service.pattern}
                label={`${service.name} last 30 checks, sample data`}
                className="col-span-2 md:col-span-1"
              />
              <span className="hidden text-[10px] font-black tabular-nums text-foreground/70 md:block">
                {service.latency}
              </span>
              <span className="hidden text-[10px] font-black tabular-nums text-foreground/70 md:block">
                {service.uptime}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-warning/5 px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">
          SEARCH_API degraded
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/40">
          Medium · Investigating · opened automatically
        </span>
      </div>
    </div>
  );
}
