import Link from "next/link";
import { cn } from "@/lib/utils";

export interface IncidentDelivery {
  id: string;
  kind: "DOWN" | "RECOVERY";
  channel: "EMAIL" | "TELEGRAM";
  status: "PENDING" | "PROCESSING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
  attempts: number;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
}

export const isInFlight = (d: IncidentDelivery) => d.status === "PENDING" || d.status === "PROCESSING";

function describe(d: IncidentDelivery): { label: string; tone: string } {
  switch (d.status) {
    case "PENDING":
      return d.attempts > 0 ? { label: "Retrying", tone: "text-warning border-warning/30" } : { label: "Queued", tone: "text-warning border-warning/30" };
    case "PROCESSING":
      return { label: "Sending", tone: "text-warning border-warning/30" };
    case "SENT":
      return { label: "Sent", tone: "text-success border-success/30" };
    case "DELIVERED":
      return { label: "Delivered", tone: "text-success border-success/30" };
    case "FAILED":
      return { label: "Failed", tone: "text-error border-error/30" };
    default:
      return { label: "Skipped", tone: "text-foreground/50 border-border" };
  }
}

const KIND_LABEL = { DOWN: "Down alert", RECOVERY: "Recovery notice" } as const;
const CHANNEL_LABEL = { EMAIL: "Email", TELEGRAM: "Telegram" } as const;

/**
 * Delivery state of the alerts for one incident, straight from the notification outbox.
 * "Sent" means the provider accepted the message; only email can reach "Delivered", and only when
 * the mail provider's delivery webhook has confirmed it.
 */
export function IncidentNotifications({ automatic, deliveries }: { automatic: boolean; deliveries: IncidentDelivery[] }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mb-3">Alerts</div>

      {!automatic ? (
        <p className="text-[9px] leading-relaxed text-foreground/40">Alerts are sent for incidents Runtime HQ opens from failed checks, not for incidents declared by hand.</p>
      ) : deliveries.length === 0 ? (
        <p className="text-[9px] leading-relaxed text-foreground/40">
          No alert was sent: no notification channel was set up when this incident opened.{" "}
          <Link href="/settings#notifications" className="text-accent hover:underline">Set up alerts</Link>
        </p>
      ) : (
        <>
          <ul className="space-y-2" aria-label="Alert delivery status">
            {deliveries.map((d) => {
              const state = describe(d);
              return (
                <li key={d.id} className="text-[9px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground/70">
                      {KIND_LABEL[d.kind]} <span className="text-foreground/40">· {CHANNEL_LABEL[d.channel]}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-sm border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest", state.tone)}>{state.label}</span>
                  </div>
                  {d.error && <p className="mt-0.5 text-[8px] text-foreground/40">{d.error}</p>}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[8px] leading-relaxed text-foreground/30">
            Sent = accepted by the provider. Email only shows Delivered once the mail provider confirms it.
          </p>
        </>
      )}
    </div>
  );
}
