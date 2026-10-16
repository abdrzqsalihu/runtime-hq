"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BellRing, X } from "lucide-react";

interface Overview {
  providers: { email: boolean; telegram: boolean };
  email: { verified: boolean };
  telegram: { connected: boolean; status: "ACTIVE" | "BLOCKED" | "INVALID" | null };
}

const DISMISS_KEY = "runtimehq.alertsPromptDismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Dashboard hint about alerts, driven by the persisted notification settings:
 * - nothing configured (and the server can send something): a dismissible prompt
 * - a channel that can no longer deliver: a warning that stays until it is fixed
 * - configured: a single quiet status line, no banner
 * Renders nothing until the settings have loaded, so it never flashes the wrong state.
 */
export function AlertsPrompt() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dismissed, setDismissed] = useState(true); // hidden until localStorage has been read

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setDismissed(readDismissed());
    });
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Overview | null) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!overview) return null;

  const telegramOn = overview.telegram.connected && overview.telegram.status === "ACTIVE";
  const telegramBroken = overview.telegram.connected && overview.telegram.status !== "ACTIVE";
  const emailOn = overview.email.verified;
  const canSendAnything = overview.providers.telegram || overview.providers.email;

  if (telegramBroken) {
    return (
      <div role="alert" className="mb-6 flex items-start gap-3 rounded-sm border border-warning/30 bg-warning/5 p-3">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
        <p className="text-[10px] font-bold leading-relaxed text-foreground/70">
          Telegram alerts can&apos;t be delivered right now{emailOn ? " (email alerts still work)" : ""}.{" "}
          <Link href="/settings#notifications" className="text-accent hover:underline">Reconnect Telegram</Link>
        </p>
      </div>
    );
  }

  if (telegramOn || emailOn) {
    const channels = [telegramOn && "Telegram", emailOn && "Email"].filter(Boolean).join(" + ");
    return (
      <p className="mb-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-foreground/40">
        <BellRing className="h-3 w-3 text-success" />
        Alerts on: <span className="text-foreground/70">{channels}</span>
        <span aria-hidden="true">·</span>
        <Link href="/settings#notifications" className="text-foreground/50 hover:text-accent">Manage</Link>
      </p>
    );
  }

  if (dismissed || !canSendAnything) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-sm border border-border bg-foreground/[0.02] p-3">
      <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <p className="flex-1 text-[10px] font-bold leading-relaxed text-foreground/60">
        Get a message when a service goes down and when it recovers, on Telegram or by email.{" "}
        <Link href="/settings#notifications" className="text-accent hover:underline">Set up alerts</Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss alerts prompt"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // the prompt just reappears next visit
          }
        }}
        className="shrink-0 cursor-pointer rounded-sm p-1 text-foreground/30 hover:text-foreground/70"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
