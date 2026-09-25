"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { RuleLabel } from "./RuleLabel";
import { useInView, useReducedMotion } from "./hooks";
import { WRAP } from "./layout";
import { LIFECYCLE_SEGMENTS, LIFECYCLE_STEPS, STATE_META } from "./sample-data";

const TICKS = [
  { at: 0, label: "09:00:03" },
  { at: LIFECYCLE_SEGMENTS[1].from, label: "09:15:04" },
  { at: LIFECYCLE_SEGMENTS[2].from, label: "09:20:16" },
];

const SEGMENT_TONE = {
  o: "bg-success/55",
  x: "bg-error/70",
  d: "bg-warning/60",
  ".": "bg-foreground/10",
} as const;

export function Lifecycle() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, 0.3);
  const reduced = useReducedMotion();
  const visible = inView || reduced;

  return (
    <section
      ref={ref}
      id="how-it-works"
      aria-labelledby="lifecycle-heading"
      className="scroll-mt-12 border-b border-border"
    >
      <div className={cn(WRAP, "py-20 lg:py-32")}>
        <RuleLabel left="INCIDENT_LIFECYCLE" right="ORDERS_API · SAMPLE_DATA" />

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:items-end lg:gap-16">
          <h2
            id="lifecycle-heading"
            className="text-[clamp(2.25rem,5.6vw,6rem)] font-black leading-[0.95] tracking-[-0.04em] lg:col-span-8"
          >
            When a service fails, the history shows it.
          </h2>
          <div className="lg:col-span-4 lg:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/45">
              Outage duration · recorded on resolve
            </p>
            <p className="mt-2 text-[clamp(3.5rem,8vw,7.5rem)] font-black leading-[0.85] tracking-[-0.05em] tabular-nums text-error">
              5m 12s
            </p>
          </div>
        </div>

        <div className="mt-14 lg:mt-20">
          <div className="relative h-6" aria-hidden>
            {TICKS.map((tick) => (
              <span
                key={tick.label}
                className={cn(
                  "absolute top-0 text-[10px] font-black tabular-nums text-foreground/50",
                  tick.at === 0 ? "left-0" : tick.at > 0.85 ? "-translate-x-1/2" : "-translate-x-0",
                )}
                style={tick.at === 0 ? undefined : { left: `${tick.at * 100}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
          <div
            role="img"
            aria-label="ORDERS_API state over time: operational, outage for 5 minutes 12 seconds, operational again. Sample data."
            className="relative h-12 bg-foreground/[0.05] sm:h-16"
          >
            {LIFECYCLE_SEGMENTS.map((segment, i) => (
              <span
                key={i}
                className={cn(
                  "absolute inset-y-0 flex origin-left items-center overflow-hidden whitespace-nowrap px-3 text-[10px] font-black uppercase tracking-widest text-foreground/85 transition-transform duration-700 ease-out motion-reduce:transition-none",
                  SEGMENT_TONE[segment.state],
                  visible ? "scale-x-100" : "scale-x-0",
                )}
                style={{
                  left: `${segment.from * 100}%`,
                  width: `${(segment.to - segment.from) * 100}%`,
                  transitionDelay: visible && !reduced ? `${i * 650}ms` : "0ms",
                }}
              >
                <span className="hidden sm:inline">{STATE_META[segment.state].label}</span>
              </span>
            ))}
          </div>
        </div>

        <ol className="mt-10 grid gap-y-8 lg:mt-14 lg:grid-cols-5 lg:gap-x-6">
          {LIFECYCLE_STEPS.map((step, i) => (
            <li
              key={step.label}
              className={cn(
                "border-t-2 pt-4 transition-all duration-700 motion-reduce:transition-none",
                step.state === "x" ? "border-error" : "border-success",
                visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              )}
              style={{ transitionDelay: visible && !reduced ? `${300 + i * 350}ms` : "0ms" }}
            >
              <p className="text-2xl font-black tabular-nums tracking-tight text-foreground">
                {step.time}
              </p>
              <p
                className={cn(
                  "mt-2 text-[10px] font-black uppercase tracking-[0.2em]",
                  STATE_META[step.state].text,
                )}
              >
                {step.label}
              </p>
              {step.result && (
                <p className="mt-3 text-sm font-black text-foreground">{step.result}</p>
              )}
              <p className="mt-1 text-sm leading-relaxed text-foreground/60">{step.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
