import { Activity, Gauge, History, RefreshCw, Server, ShieldAlert, type LucideIcon } from "lucide-react";
import { SectionHeading } from "./SectionHeading";

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Activity,
    title: "Continuous_Checks",
    body: "Monitored HTTP services are checked automatically every five minutes with a real GET request and a 3-second timeout.",
  },
  {
    icon: History,
    title: "Heartbeat_History",
    body: "See the outcome of recent checks as a heartbeat strip, not only the current status.",
  },
  {
    icon: Gauge,
    title: "Uptime_&_Latency",
    body: "Availability is calculated from recorded checks, and every result includes measured response latency.",
  },
  {
    icon: ShieldAlert,
    title: "Automatic_Incidents",
    body: "A healthy service that starts failing opens an incident, and recovery resolves it. Add updates or declare your own.",
  },
  {
    icon: RefreshCw,
    title: "Check_Now",
    body: "Run a check immediately from a service's page while you investigate. A short cooldown prevents repeat runs.",
  },
  {
    icon: Server,
    title: "Service_Control",
    body: "Add, categorize and remove services. Everything is scoped to your account.",
  },
];

export function Capabilities() {
  return (
    <section id="features" className="scroll-mt-14 border-b border-border" aria-labelledby="features-heading">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <SectionHeading
          id="features-heading"
          eyebrow="Capabilities"
          title="What Runtime HQ does today."
          description="A focused set of monitoring tools for HTTP services, all built around the checks that actually ran."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="bg-background p-6">
              <item.icon className="mb-5 h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-foreground/90">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-foreground/60">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
