import { cn } from "@/lib/utils";
import { Heartbeat } from "./Heartbeat";
import { RuleLabel } from "./RuleLabel";
import { WRAP } from "./layout";
import { CHECK_LOG, ok, STATE_META } from "./sample-data";

export function Evidence() {
  return (
    <section className="border-b border-border bg-surface" aria-labelledby="evidence-heading">
      <div className={cn(WRAP, "py-20 lg:py-32")}>
        <RuleLabel left="CHECK_HISTORY" right="SAMPLE_DATA" />

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/45">
              Checks recorded · one service · 7 days
            </p>
            <p
              className="mt-4 text-[clamp(5rem,11.5vw,12rem)] font-black leading-[0.85] tracking-[-0.06em] tabular-nums text-foreground"
              aria-label="2,016 checks"
            >
              2,016
            </p>
            <p className="mt-10 max-w-sm text-sm leading-relaxed text-foreground/60">
              That is 288 checks a day on a 5-minute schedule. Each one keeps its status, HTTP code
              and measured latency.
            </p>
          </div>

          <div className="lg:col-span-7 lg:pt-6">
            <h2
              id="evidence-heading"
              className="text-[clamp(2rem,4.6vw,4.75rem)] font-black leading-[0.98] tracking-[-0.04em] text-foreground"
            >
              Configured is not the same as checked.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/65">
              Adding a service does not make it healthy. Until the first check runs, Runtime HQ
              shows it as awaiting check. After that, health is whatever the checks returned.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-14 lg:mt-24 lg:grid-cols-12 lg:gap-16">
          <div className="space-y-10 lg:col-span-7">
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span className="text-lg font-black tracking-tight text-foreground/80">
                  NEW_SERVICE
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/45">
                  <span className={cn("h-2 w-2 rounded-full", STATE_META["."].dot)} />
                  Awaiting check · 0 checks
                </span>
              </div>
              <Heartbeat
                cells={".".repeat(30)}
                label="No checks recorded yet, sample data"
                className="h-12 sm:h-16"
              />
            </div>
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span className="text-lg font-black tracking-tight text-foreground">
                  INVENTORY_API
                </span>
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-success">
                  <span className={cn("h-2 w-2 rounded-full", STATE_META.o.dot)} />
                  Operational · 1 failure recorded
                </span>
              </div>
              <Heartbeat
                cells={ok(13) + "x" + ok(16)}
                label="INVENTORY_API last 30 checks with one outage, sample data"
                className="h-12 sm:h-16"
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-foreground/45">
              INVENTORY_API · recent checks
            </p>
            <ul className="border-t border-border">
              {CHECK_LOG.map((row) => (
                <li
                  key={row.time}
                  className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-x-4 border-b border-border py-3.5 text-sm font-bold tabular-nums"
                >
                  <span className="text-foreground/45">{row.time}</span>
                  <span className={row.state === "x" ? "text-error" : "text-foreground/80"}>
                    {row.result} · {row.latency}
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                      STATE_META[row.state].text,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATE_META[row.state].dot)} />
                    <span className="hidden sm:inline">{STATE_META[row.state].label}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
