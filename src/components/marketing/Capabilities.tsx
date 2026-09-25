import { cn } from "@/lib/utils";
import { RuleLabel } from "./RuleLabel";
import { WRAP } from "./layout";

const INDEX = [
  ["MONITORING", "HTTP checks · latency · status"],
  ["INCIDENTS", "Automatic detection · resolution · duration · manual declaration"],
  ["HISTORY", "Every check stored · timelines · uptime from recorded results"],
  ["CONTROL", "Manual checks · service registry · per-user ownership"],
];

export function Capabilities() {
  return (
    <section
      id="features"
      aria-labelledby="capabilities-heading"
      className="scroll-mt-12 border-b border-border bg-surface"
    >
      <div className={cn(WRAP, "py-20 lg:py-32")}>
        <RuleLabel left="SYSTEM_INDEX" />

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-16">
          <h2
            id="capabilities-heading"
            className="text-[clamp(2.25rem,5.2vw,5.5rem)] font-black leading-[0.95] tracking-[-0.04em] lg:col-span-5"
          >
            Every check leaves a record.
          </h2>

          <dl className="border-t border-border lg:col-span-7">
            {INDEX.map(([term, detail], i) => (
              <div
                key={term}
                className="group grid gap-x-8 gap-y-1 border-b border-border py-6 sm:grid-cols-[2.5rem_11rem_1fr] sm:items-baseline lg:py-8"
              >
                <span className="hidden text-[10px] font-black tabular-nums text-foreground/30 sm:block">
                  0{i + 1}
                </span>
                <dt className="text-xl font-black tracking-tight text-foreground transition-colors group-hover:text-accent lg:text-2xl">
                  {term}
                </dt>
                <dd className="text-sm leading-relaxed text-foreground/65 lg:text-base">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
