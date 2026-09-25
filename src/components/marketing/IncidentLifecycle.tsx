import { cn } from "@/lib/utils";
import { HeartbeatBar } from "./HeartbeatBar";
import { SectionHeading } from "./SectionHeading";

const STEPS = [
  {
    label: "Service_Health",
    detail: "Checks pass and the service is operational.",
    dot: "bg-success",
    text: "text-success/80",
  },
  {
    label: "Check_Fails",
    detail: "A check times out or returns a failing status.",
    dot: "bg-error",
    text: "text-error/80",
  },
  {
    label: "Incident_Opens",
    detail: "An incident is created automatically, with a severity.",
    dot: "bg-error animate-pulse",
    text: "text-error/80",
  },
  {
    label: "Service_Recovers",
    detail: "A later check succeeds.",
    dot: "bg-success",
    text: "text-success/80",
  },
  {
    label: "Incident_Resolves",
    detail: "The incident resolves and records how long it lasted.",
    dot: "bg-success",
    text: "text-success/80",
  },
];

const LOG = [
  {
    time: "10:20",
    severity: "Critical",
    message: "Outage detected: Service unavailable",
    tone: "text-error/80",
  },
  {
    time: "10:35",
    severity: "Low",
    message: "Service recovered and incident automatically resolved (duration: 15m 0s)",
    tone: "text-success/80",
  },
];

export function IncidentLifecycle() {
  return (
    <section className="border-b border-border" aria-labelledby="lifecycle-heading">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <SectionHeading
          id="lifecycle-heading"
          eyebrow="Incident_Lifecycle"
          title="From a failed check to a resolved incident, without filing anything."
          description="When a healthy service fails a check, Runtime HQ opens an incident. When a later check succeeds, it resolves. You can still declare an incident yourself and add updates to the timeline. Incidents are records inside Runtime HQ."
        />

        <ol className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-5">
          {STEPS.map((step, i) => (
            <li key={step.label} className="bg-background p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black tabular-nums text-foreground/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("h-2 w-2 rounded-full", step.dot)} />
              </div>
              <div
                className={cn(
                  "mb-2 text-[11px] font-black uppercase tracking-widest",
                  step.text,
                )}
              >
                {step.label}
              </div>
              <p className="text-xs leading-relaxed text-foreground/55">{step.detail}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 overflow-hidden rounded-sm border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/80">
              SEARCH_API · Outage
            </span>
            <span className="rounded-sm border border-accent/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-accent">
              Sample data
            </span>
          </div>
          <div className="border-b border-border p-4">
            <HeartbeatBar
              pattern={"o".repeat(18) + "xxx" + "o".repeat(9)}
              label="SEARCH_API check history showing three failed checks then recovery, sample data"
            />
            <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-widest text-foreground/30">
              <span>Older</span>
              <span>Latest</span>
            </div>
          </div>
          <ul className="divide-y divide-border/60">
            {LOG.map((entry) => (
              <li
                key={entry.time}
                className="grid grid-cols-[3rem_1fr] items-baseline gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[3rem_5rem_1fr]"
              >
                <span className="text-[10px] font-bold tabular-nums text-foreground/40">
                  {entry.time}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    entry.tone,
                  )}
                >
                  {entry.severity}
                </span>
                <span className="col-span-2 text-xs text-foreground/70 sm:col-span-1">
                  {entry.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
