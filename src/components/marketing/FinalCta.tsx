"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CtaLink } from "./CtaLink";
import { Heartbeat } from "./Heartbeat";
import { RuleLabel } from "./RuleLabel";
import { useInView, useReducedMotion } from "./hooks";
import { WRAP } from "./layout";

// One-shot: a service with no checks, then its first result lands.
export function FinalCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, 0.35);
  const reduced = useReducedMotion();
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!inView || reduced) return;
    const timer = window.setTimeout(() => setLanded(true), 900);
    return () => window.clearTimeout(timer);
  }, [inView, reduced]);

  const checked = landed || reduced;
  const cells = checked ? ".".repeat(29) + "o" : ".".repeat(30);

  return (
    <section ref={ref} aria-labelledby="cta-heading" className="border-b border-border">
      <div className={cn(WRAP, "py-20 lg:py-32")}>
        <RuleLabel left="READY_WHEN_YOU_ARE" />

        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:items-end lg:gap-16">
          <h2
            id="cta-heading"
            className="text-[clamp(2.5rem,7.2vw,7.75rem)] font-black leading-[0.92] tracking-[-0.045em] lg:col-span-9"
          >
            Start monitoring your services.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-3 lg:flex-col lg:items-stretch">
            {isAuthenticated ? (
              <CtaLink href="/dashboard" arrow className="h-12">
                Open Dashboard
              </CtaLink>
            ) : (
              <>
                <CtaLink href="/register" arrow className="h-12">
                  Get started
                </CtaLink>
                <CtaLink href="/login" variant="secondary" className="h-12">
                  Sign in
                </CtaLink>
              </>
            )}
          </div>
        </div>

        <div className="mt-16 lg:mt-24">
          <div className="mb-3 flex items-baseline justify-between gap-4 text-[10px] font-black uppercase tracking-widest">
            <span className="text-foreground/50">YOUR_FIRST_SERVICE</span>
            <span
              className={cn(
                "transition-colors duration-500 motion-reduce:transition-none",
                checked ? "text-success" : "text-foreground/40",
              )}
            >
              {checked ? "OPERATIONAL · HTTP 200 · 118ms" : "AWAITING_CHECK"}
            </span>
          </div>
          <Heartbeat
            cells={cells}
            newestKey={checked ? 1 : 0}
            label="A new service starts with no checks; the first result appears after the first check. Sample."
            className="h-12 sm:h-16"
          />
          <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-foreground/35">
            Sample · the first result appears as soon as the first check runs
          </p>
        </div>
      </div>
    </section>
  );
}
