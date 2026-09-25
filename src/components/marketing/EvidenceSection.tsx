import { cn } from "@/lib/utils";
import { HeartbeatBar } from "./HeartbeatBar";
import { SectionHeading } from "./SectionHeading";

const POINTS = [
  "Every check stores its status, HTTP code and measured latency.",
  "Status comes from the latest real result, not from the fact that a service was added.",
  "Uptime is calculated from recorded checks, so history explains the number.",
];

type LogTone = "ok" | "fail";

const CHECK_LOG: { time: string; result: string; latency: string; status: string; tone: LogTone }[] = [
  { time: "10:35:02", result: "HTTP 200", latency: "118ms", status: "Operational", tone: "ok" },
  { time: "10:30:01", result: "HTTP 200", latency: "124ms", status: "Operational", tone: "ok" },
  { time: "10:25:02", result: "HTTP 200", latency: "109ms", status: "Operational", tone: "ok" },
  { time: "10:20:01", result: "Timeout", latency: "3001ms", status: "Outage", tone: "fail" },
  { time: "10:15:02", result: "HTTP 200", latency: "121ms", status: "Operational", tone: "ok" },
];

export function EvidenceSection() {
  return (
    <section className="border-b border-border" aria-labelledby="evidence-heading">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="evidence-heading"
            eyebrow="Actual_Signal"
            title="Configured is not the same as checked."
            description="Adding a service doesn't make it healthy. Until the first check runs, Runtime HQ shows it as awaiting check. After that, health is whatever the checks actually returned."
          />
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-foreground/70">
                <span className="mt-2 h-px w-4 shrink-0 bg-accent" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-sm border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
              Check_Evidence
            </span>
            <span className="rounded-sm border border-accent/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent">
              Sample data
            </span>
          </div>

          <div className="space-y-4 border-b border-border p-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-tight text-foreground/85">
                  NEW_SERVICE
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                  Awaiting check · 0 checks
                </span>
              </div>
              <HeartbeatBar pattern={".".repeat(30)} label="No checks recorded yet, sample data" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-tight text-foreground/85">
                  INVENTORY_API
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-success/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Operational
                </span>
              </div>
              <HeartbeatBar
                pattern={"o".repeat(14) + "x" + "o".repeat(15)}
                label="INVENTORY_API last 30 checks with one outage, sample data"
              />
            </div>
          </div>

          <div className="px-4 pb-2 pt-3 text-[9px] font-black uppercase tracking-[0.2em] text-foreground/40">
            INVENTORY_API · recent checks
          </div>
          <ul className="divide-y divide-border/60 pb-1">
            {CHECK_LOG.map((row) => (
              <li
                key={row.time}
                className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 px-4 py-2 text-[10px] font-bold tabular-nums sm:grid-cols-[5rem_1fr_4rem_6.5rem]"
              >
                <span className="text-foreground/40">{row.time}</span>
                <span className="font-black uppercase tracking-widest text-foreground/70">
                  {row.result}
                </span>
                <span className="text-right text-foreground/60 sm:text-left">{row.latency}</span>
                <span
                  className={cn(
                    "hidden text-right font-black uppercase tracking-widest sm:block",
                    row.tone === "ok" ? "text-success/80" : "text-error/80",
                  )}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
