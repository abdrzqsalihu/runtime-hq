import { cn } from "@/lib/utils";
import { RuleLabel } from "./RuleLabel";
import { WRAP } from "./layout";

const FLOW = [
  {
    n: "01",
    label: "Checks run",
    text: "Every service is requested on a schedule and the result is stored.",
    tone: "border-foreground/30",
  },
  {
    n: "02",
    label: "Failures repeat",
    text: "One bad response isn't enough. Consecutive failed checks are.",
    tone: "border-error",
  },
  {
    n: "03",
    label: "Incident opens",
    text: "An incident is created automatically, with a severity.",
    tone: "border-error",
  },
  {
    n: "04",
    label: "You're alerted",
    text: "Telegram and email, wherever you've set them up.",
    tone: "border-accent",
  },
  {
    n: "05",
    label: "Recovery notice",
    text: "When checks pass again, the incident resolves and you're told.",
    tone: "border-success",
  },
];

function Message({
  tone,
  title,
  lines,
  link,
}: {
  tone: "down" | "up";
  title: string;
  lines: string[];
  link: string;
}) {
  return (
    <div
      className={cn(
        "border-l-2 bg-foreground/[0.03] px-4 py-3",
        tone === "down" ? "border-error" : "border-success",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-black",
          tone === "down" ? "text-error" : "text-success",
        )}
      >
        {title}
      </p>
      {lines.map((line, i) => (
        <p
          key={line}
          className={cn(
            "text-xs leading-relaxed",
            i === 0 ? "mt-1 font-black text-foreground" : "text-foreground/60",
          )}
        >
          {line}
        </p>
      ))}
      <p className="mt-1 text-xs font-bold text-accent">{link}</p>
    </div>
  );
}

function Panel({
  label,
  meta,
  children,
}: {
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/80">
          {label}
        </p>
        <p className="rounded-sm border border-border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-foreground/40">
          {meta}
        </p>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function EmailRow({
  tone,
  subject,
  preview,
}: {
  tone: "down" | "up";
  subject: string;
  preview: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <span
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          tone === "down" ? "bg-error" : "bg-success",
        )}
      />
      <div className="min-w-0">
        <p className="break-words text-xs font-black text-foreground">
          {subject}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">
          {preview}
        </p>
      </div>
    </div>
  );
}

export function Alerts() {
  return (
    <section
      id="alerts"
      aria-labelledby="alerts-heading"
      className="scroll-mt-12 border-b border-border bg-surface"
    >
      <div className={cn(WRAP, "py-20 lg:py-32")}>
        <RuleLabel left="ALERTS" right="TELEGRAM · EMAIL" />

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12 lg:items-end lg:gap-16">
          <h2
            id="alerts-heading"
            className="text-[clamp(2.25rem,5.2vw,5.5rem)] font-black leading-[0.95] tracking-[-0.04em] lg:col-span-7"
          >
            Hear about it before your users do.
          </h2>
          <p className="max-w-md text-base leading-relaxed text-foreground/65 lg:col-span-5 lg:pb-2">
            You shouldn&apos;t have to keep a dashboard open. Runtime HQ
            messages you when a service goes down, and again when it recovers.
          </p>
        </div>

        <ol className="mt-14 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:mt-20 lg:grid-cols-5">
          {FLOW.map((step) => (
            <li key={step.n} className={cn("border-t-2 pt-4", step.tone)}>
              <p className="text-[10px] font-black tabular-nums tracking-widest text-foreground/35">
                {step.n}
              </p>
              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground">
                {step.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-2 lg:gap-8">
          <Panel label="Telegram · Runtime Beacon" meta="SAMPLE_DATA">
            <Message
              tone="down"
              title="Service down"
              lines={[
                "ORDERS_API",
                "https://api.example.com/orders/health",
                "Severity: CRITICAL",
                "Started: 09:15 UTC",
              ]}
              link="View incident"
            />
            <Message
              tone="up"
              title="Recovered"
              lines={["ORDERS_API", "Resolved: 09:20 UTC", "Duration: 5m 12s"]}
              link="View incident"
            />
          </Panel>

          <Panel label="Email" meta="SAMPLE_DATA">
            <EmailRow
              tone="down"
              subject="[Runtime HQ] Service down: ORDERS_API"
              preview="ORDERS_API is down. Severity CRITICAL, started 09:15 UTC. View the incident in your dashboard."
            />
            <EmailRow
              tone="up"
              subject="[Runtime HQ] Recovered: ORDERS_API"
              preview="ORDERS_API has recovered after 5m 12s. The incident is resolved and its history is kept."
            />
          </Panel>
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-foreground/50">
          Alerts are off until you turn them on. After signing up, connect
          Telegram by pressing Start in a chat with Runtime Beacon, and/or
          confirm an email address with a link, in Settings. Choose per channel
          whether you want down alerts, recovery notices, or both.
        </p>
      </div>
    </section>
  );
}
