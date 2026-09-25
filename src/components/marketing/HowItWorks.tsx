import { SectionHeading } from "./SectionHeading";

const STEPS = [
  { title: "Add_a_service", body: "Give it a name and an HTTP endpoint." },
  {
    title: "Runtime_HQ_checks",
    body: "A real request goes to the endpoint every five minutes. Run one on demand with Check Now.",
  },
  { title: "Results_become_history", body: "Status, HTTP code and latency are stored for every check." },
  { title: "Failures_become_incidents", body: "A healthy service that starts failing opens an incident." },
  { title: "Recovery_resolves", body: "When a check succeeds again the incident resolves. The history stays." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-14 border-b border-border" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <SectionHeading
          id="how-heading"
          eyebrow="How_It_Works"
          title="One loop, from endpoint to resolved incident."
        />

        <ol className="relative mt-12 space-y-0 md:grid md:grid-cols-5 md:gap-6 md:space-y-0">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative border-l border-border pb-8 pl-6 last:pb-0 md:border-l-0 md:border-t md:pb-0 md:pl-0 md:pt-6"
            >
              <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border border-accent bg-background md:-top-[5px] md:left-0" />
              <div className="mb-2 text-[10px] font-black tabular-nums tracking-widest text-accent">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-foreground/90">
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed text-foreground/55">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
