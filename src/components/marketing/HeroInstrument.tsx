"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Heartbeat } from "./Heartbeat";
import { RuleLabel } from "./RuleLabel";
import { useInView, useReducedMotion } from "./hooks";
import { CYCLE_TIMES, INSTRUMENT_SERVICES, STATE_META, type Cell } from "./sample-data";

const LAST_CYCLE = CYCLE_TIMES.length - 1;
const CYCLE_MS = 3600;

const GRID =
  "grid grid-cols-[1fr_auto] items-center gap-x-8 gap-y-4 lg:grid-cols-[minmax(190px,0.9fr)_minmax(150px,0.62fr)_minmax(0,3.1fr)_minmax(110px,0.55fr)]";
const LG_RESET = "lg:col-span-1 lg:col-start-auto lg:row-start-auto lg:justify-self-auto";

// One scheduled check cycle every few seconds, a handful of times, then it settles.
export function HeroInstrument() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.2);
  const reduced = useReducedMotion();
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!inView || reduced || cycle >= LAST_CYCLE) return;
    const timer = window.setTimeout(() => setCycle(cycle + 1), CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [inView, reduced, cycle]);

  const shown = cycle;
  const time = CYCLE_TIMES[shown];

  return (
    <div ref={ref} className="pb-14 lg:pb-24" role="group" aria-label="Sample service health">
      <RuleLabel
        left="SERVICE_HEALTH"
        right={
          <>
            SAMPLE_DATA · LAST_CHECK{" "}
            <span key={time} className="rhq-flash tabular-nums text-foreground/80">
              {time}
            </span>
          </>
        }
      />

      <ul className="mt-6 border-t border-border">
        {INSTRUMENT_SERVICES.map((service) => {
          const cells = (service.base + service.state.repeat(shown)).slice(-30);
          const latency = service.latencies[shown];
          const meta = STATE_META[service.state as Cell];
          const checked = service.state !== ".";

          return (
            <li key={service.name} className="border-b border-border">
              <div className={cn(GRID, "py-6 lg:py-7")}>
                <div className={cn("col-start-1 row-start-1 min-w-0", LG_RESET)}>
                  <p className="text-xl font-black tracking-tight text-foreground lg:text-2xl">
                    {service.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-foreground/35">
                    {service.endpoint}
                  </p>
                </div>

                <div
                  className={cn(
                    "col-start-2 row-start-1 justify-self-end text-right lg:text-left",
                    LG_RESET,
                  )}
                >
                  <p className="flex items-center justify-end gap-2 lg:justify-start">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        meta.dot,
                        service.state === "o" && "animate-pulse",
                      )}
                    />
                    <span
                      className={cn("text-[11px] font-black uppercase tracking-widest", meta.text)}
                    >
                      {meta.label}
                    </span>
                  </p>
                  <p
                    key={`${service.name}-${shown}`}
                    className="rhq-flash mt-1 text-[10px] font-bold uppercase tracking-widest tabular-nums text-foreground/40"
                  >
                    {checked ? `HTTP ${service.http} · ${time}` : "NO_CHECK_YET"}
                  </p>
                </div>

                <div className={cn("col-span-2 row-start-2", LG_RESET, "lg:order-3")}>
                  <Heartbeat
                    cells={cells}
                    newestKey={checked ? shown : 0}
                    label={`${service.name}: ${meta.label}, last 30 checks, sample data`}
                    className="h-9 sm:h-11 lg:h-12"
                  />
                </div>

                <div className={cn("hidden text-right lg:order-4 lg:block", LG_RESET)}>
                  <span
                    className={cn(
                      "text-4xl font-black leading-none tracking-[-0.04em] tabular-nums lg:text-5xl",
                      checked ? "text-foreground" : "text-foreground/25",
                    )}
                  >
                    {checked ? latency : "—"}
                  </span>
                  {checked && (
                    <span className="ml-1 text-xs font-black text-foreground/40">ms</span>
                  )}
                </div>

                <p
                  className="col-span-2 -mt-1 flex items-baseline justify-between text-[10px] font-black uppercase tracking-widest text-foreground/40 lg:hidden"
                >
                  <span>LATENCY</span>
                  <span className="text-lg normal-case tracking-tight tabular-nums text-foreground">
                    {checked ? `${latency}ms` : "—"}
                  </span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
