"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, ExternalLink, Loader2, Mail, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/use-toast";
import { useSession } from "@/lib/auth-client";

interface HistoryItem {
  id: string;
  channel: "EMAIL" | "TELEGRAM";
  type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED" | "TEST";
  subject: string | null;
  status: "PENDING" | "PROCESSING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";
  attempts: number;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface Overview {
  providers: { email: boolean; telegram: boolean };
  email: { address: string | null; verified: boolean; pendingAddress: string | null; pendingExpiresAt: string | null; onIncident: boolean; onRecovery: boolean };
  telegram: { connected: boolean; status: "ACTIVE" | "BLOCKED" | "INVALID" | null; displayName: string | null; linkedAt: string | null; onIncident: boolean; onRecovery: boolean };
  history: HistoryItem[];
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.message ?? "Request failed. Try again.", res.status);
  return body as T;
}

const EVENT_LABEL: Record<HistoryItem["type"], string> = { INCIDENT_OPENED: "Service down", INCIDENT_RESOLVED: "Recovered", TEST: "Test" };
const STATUS_STYLE: Record<HistoryItem["status"], string> = {
  PENDING: "text-warning border-warning/30",
  PROCESSING: "text-warning border-warning/30",
  SENT: "text-success border-success/30",
  DELIVERED: "text-success border-success/30",
  FAILED: "text-error border-error/30",
  SKIPPED: "text-foreground/50 border-border",
};
const STATUS_LABEL: Record<HistoryItem["status"], string> = { PENDING: "Queued", PROCESSING: "Sending", SENT: "Sent", DELIVERED: "Delivered", FAILED: "Failed", SKIPPED: "Skipped" };

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-accent border-accent" : "bg-foreground/10 border-border",
        )}
      >
        <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

function Notice({ tone, children }: { tone: "warning" | "error" | "info"; children: React.ReactNode }) {
  const styles = { warning: "border-warning/30 bg-warning/5 text-warning", error: "border-error/30 bg-error/5 text-error", info: "border-border bg-foreground/[0.02] text-foreground/60" }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-sm border p-3 text-[10px] font-bold leading-relaxed", styles)}>
      {tone !== "info" && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const primaryButton = cn(buttonBase, "bg-accent text-black hover:bg-accent/80");
const secondaryButton = cn(buttonBase, "border border-border text-foreground/70 hover:border-accent/40 hover:text-accent");
const dangerButton = cn(buttonBase, "border border-error/20 text-error hover:bg-error/10");

function ChannelCard({ icon: Icon, title, status, children }: { icon: typeof Mail; title: string; status: { label: string; tone: "ok" | "warn" | "off" }; children: React.ReactNode }) {
  const tone = { ok: "text-success border-success/30", warn: "text-warning border-warning/30", off: "text-foreground/50 border-border" }[status.tone];
  return (
    <section aria-label={title} className="border-t border-border first:border-t-0">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-5">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-accent" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">{title}</h4>
        </div>
        <span role="status" className={cn("rounded-sm border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest", tone)}>{status.label}</span>
      </div>
      <div className="space-y-4 px-4 sm:px-6 pb-6 pt-4">{children}</div>
    </section>
  );
}

export function NotificationSettings() {
  const toast = useToast();
  const { data: session } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const confirmedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const overview = await api<Overview>("/api/notifications");
      setData(overview);
      setLoadError(null);
      return overview;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load notification settings.");
      return null;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  // Returning from the confirmation email: /settings?confirm_email=<token>
  useEffect(() => {
    if (confirmedRef.current) return;
    const token = new URLSearchParams(window.location.search).get("confirm_email");
    if (!token) return;
    confirmedRef.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    void (async () => {
      try {
        const result = await api<{ address: string }>("/api/notifications/email/confirm", { method: "POST", body: JSON.stringify({ token }) });
        toast.success("EMAIL_CONFIRMED", `${result.address} will now receive alerts.`);
        await load();
      } catch (err) {
        toast.error("EMAIL_CONFIRMATION_FAILED", err instanceof Error ? err.message : "Could not confirm the email address.");
      }
    })();
  }, [load, toast]);

  // While a Telegram link is pending, poll for the real connection (the page never assumes it).
  const linkExpiresAt = link?.expiresAt;
  const telegramConnected = data?.telegram.connected && data.telegram.status === "ACTIVE";
  useEffect(() => {
    if (!linkExpiresAt) return;
    const timer = window.setInterval(async () => {
      setNow(Date.now());
      const overview = await load();
      if (overview?.telegram.connected && overview.telegram.status === "ACTIVE") {
        setLink(null);
        toast.success("TELEGRAM_CONNECTED", "Telegram is connected.");
      } else if (Date.now() > linkExpiresAt) {
        setLink(null);
        setTelegramError("The connection link expired. Press Connect Telegram to get a new one.");
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [linkExpiresAt, load, toast]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const togglePreference = (field: "emailOnIncident" | "emailOnRecovery" | "telegramOnIncident" | "telegramOnRecovery") => (value: boolean) =>
    run(field, async () => {
      try {
        setData(await api<Overview>("/api/notifications", { method: "PATCH", body: JSON.stringify({ [field]: value }) }));
      } catch (err) {
        toast.error("SETTINGS_NOT_SAVED", err instanceof Error ? err.message : "Could not save.");
      }
    });

  const connectTelegram = () =>
    run("telegram-link", async () => {
      setTelegramError(null);
      try {
        const result = await api<{ url: string; expiresAt: string }>("/api/notifications/telegram/link", { method: "POST" });
        setLink({ url: result.url, expiresAt: new Date(result.expiresAt).getTime() });
        setNow(Date.now());
      } catch (err) {
        setTelegramError(err instanceof Error ? err.message : "Could not start the connection.");
      }
    });

  const disconnectTelegram = () =>
    run("telegram-disconnect", async () => {
      try {
        await api("/api/notifications/telegram", { method: "DELETE" });
        setLink(null);
        toast.info("TELEGRAM_DISCONNECTED", "Telegram alerts are off.");
        await load();
      } catch (err) {
        setTelegramError(err instanceof Error ? err.message : "Could not disconnect.");
      }
    });

  const testChannel = (channel: "telegram" | "email") =>
    run(`${channel}-test`, async () => {
      const setError = channel === "telegram" ? setTelegramError : setEmailError;
      setError(null);
      try {
        await api(`/api/notifications/${channel}/test`, { method: "POST" });
        toast.success("TEST_SENT", channel === "telegram" ? "Check your Telegram chat." : "Check your inbox.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "The test could not be sent.";
        setError(message);
        toast.error("TEST_FAILED", message);
      }
      await load();
    });

  const sendConfirmation = () =>
    run("email-confirm", async () => {
      setEmailError(null);
      try {
        const result = await api<{ pendingAddress: string }>("/api/notifications/email", { method: "POST", body: JSON.stringify({ address: emailInput }) });
        setEditingEmail(false);
        toast.success("CONFIRMATION_SENT", `We emailed a link to ${result.pendingAddress}.`);
        await load();
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : "Could not send the confirmation email.");
      }
    });

  const removeEmail = () =>
    run("email-remove", async () => {
      try {
        await api("/api/notifications/email", { method: "DELETE" });
        setEditingEmail(false);
        toast.info("EMAIL_REMOVED", "Email alerts are off.");
        await load();
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : "Could not remove the address.");
      }
    });

  if (!data) {
    return (
      <div className="p-6">
        {loadError ? (
          <Notice tone="error">{loadError}</Notice>
        ) : (
          <div role="status" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading notification settings
          </div>
        )}
      </div>
    );
  }

  const { telegram, email, providers } = data;
  const secondsLeft = link ? Math.max(0, Math.round((link.expiresAt - now) / 1000)) : 0;
  const needsReconnect = telegram.connected && telegram.status !== "ACTIVE";
  const showEmailForm = !email.verified || editingEmail;
  const emailValue = emailInput || email.pendingAddress || session?.user?.email || "";

  return (
    <div>
      {/* Telegram */}
      <ChannelCard
        icon={Send}
        title="Telegram"
        status={needsReconnect ? { label: "Needs reconnect", tone: "warn" } : telegramConnected ? { label: "Connected", tone: "ok" } : { label: "Not connected", tone: "off" }}
      >
        {!providers.telegram && <Notice tone="info">Telegram alerts aren&apos;t available yet: the server hasn&apos;t been configured with a Telegram bot. Ask the administrator to finish the setup.</Notice>}

        {telegramError && <Notice tone="error">{telegramError}</Notice>}

        {needsReconnect && (
          <Notice tone="warning">
            {telegram.status === "BLOCKED"
              ? "Telegram says the bot was blocked or the account is unavailable, so alerts can't be delivered. Unblock the bot in Telegram, then reconnect."
              : "Telegram can't find this chat. Reconnect to keep receiving alerts."}
          </Notice>
        )}

        {telegramConnected && (
          <>
            <p className="text-[10px] font-bold text-foreground/60">
              Connected{telegram.displayName ? <> as <span className="text-foreground/90">{telegram.displayName}</span></> : null}
              {telegram.linkedAt ? <> · since {new Date(telegram.linkedAt).toLocaleDateString()}</> : null}
            </p>
            <div className="divide-y divide-border/50">
              <Switch checked={telegram.onIncident} onChange={togglePreference("telegramOnIncident")} label="Alert when a service goes down" disabled={busy !== null} />
              <Switch checked={telegram.onRecovery} onChange={togglePreference("telegramOnRecovery")} label="Notify when a service recovers" disabled={busy !== null} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => testChannel("telegram")} disabled={busy !== null || !providers.telegram}>
                {busy === "telegram-test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send test message
              </button>
              <button type="button" className={dangerButton} onClick={disconnectTelegram} disabled={busy !== null}>Disconnect</button>
            </div>
          </>
        )}

        {!telegramConnected && providers.telegram && (
          <>
            {!link && (
              <ol className="list-decimal space-y-1 pl-5 text-[10px] font-bold leading-relaxed text-foreground/60">
                <li>Press <span className="text-foreground/90">{needsReconnect ? "Reconnect" : "Connect"} Telegram</span> to get a personal link (valid 15 minutes).</li>
                <li>Open it, then press <span className="text-foreground/90">Start</span> in the chat with the bot.</li>
                <li>Come back here. This page updates by itself once Telegram confirms.</li>
              </ol>
            )}
            {link ? (
              <div className="space-y-3 rounded-sm border border-accent/30 bg-accent/5 p-4">
                <p role="status" className="flex items-center gap-2 text-[10px] font-bold text-foreground/70">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Waiting for you to press Start in Telegram… expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className={primaryButton}>
                    Open Telegram <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button type="button" className={secondaryButton} onClick={() => setLink(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButton} onClick={connectTelegram} disabled={busy !== null}>
                  {busy === "telegram-link" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {needsReconnect ? "Reconnect" : "Connect"} Telegram
                </button>
                {needsReconnect && <button type="button" className={dangerButton} onClick={disconnectTelegram} disabled={busy !== null}>Disconnect</button>}
              </div>
            )}
          </>
        )}
      </ChannelCard>

      {/* Email */}
      <ChannelCard
        icon={Mail}
        title="Email"
        status={email.verified ? { label: "Active", tone: "ok" } : email.pendingAddress ? { label: "Awaiting confirmation", tone: "warn" } : { label: "Not set up", tone: "off" }}
      >
        {!providers.email && <Notice tone="info">Email alerts aren&apos;t available yet: the server hasn&apos;t been configured with an email sender. Ask the administrator to finish the setup.</Notice>}
        {emailError && <Notice tone="error">{emailError}</Notice>}

        {email.verified && !editingEmail && (
          <>
            <p className="flex items-center gap-2 text-[10px] font-bold text-foreground/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Alerts go to <span className="break-all text-foreground/90">{email.address}</span>
            </p>
            <div className="divide-y divide-border/50">
              <Switch checked={email.onIncident} onChange={togglePreference("emailOnIncident")} label="Alert when a service goes down" disabled={busy !== null} />
              <Switch checked={email.onRecovery} onChange={togglePreference("emailOnRecovery")} label="Notify when a service recovers" disabled={busy !== null} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButton} onClick={() => testChannel("email")} disabled={busy !== null || !providers.email}>
                {busy === "email-test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Send test email
              </button>
              <button type="button" className={secondaryButton} onClick={() => { setEditingEmail(true); setEmailInput(""); }} disabled={busy !== null}>Change address</button>
              <button type="button" className={dangerButton} onClick={removeEmail} disabled={busy !== null}>Remove</button>
            </div>
          </>
        )}

        {email.pendingAddress && (
          <Notice tone="info">
            We sent a confirmation link to <span className="break-all text-foreground/90">{email.pendingAddress}</span>. Open it while signed in here to turn alerts on (valid for 60 minutes). Nothing is sent to this address until then.
          </Notice>
        )}

        {showEmailForm && providers.email && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendConfirmation();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="notification-email" className="text-[9px] font-black uppercase tracking-widest text-foreground/50">Alert email address</label>
              <input
                id="notification-email"
                type="email"
                required
                autoComplete="email"
                value={emailValue}
                onChange={(event) => setEmailInput(event.target.value)}
                className="w-full rounded-sm border border-border bg-foreground/[0.03] px-3 py-2.5 text-[11px] font-bold tracking-wide text-foreground placeholder:text-foreground/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20"
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={primaryButton} disabled={busy !== null}>
                {busy === "email-confirm" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {email.pendingAddress ? "Resend confirmation" : "Send confirmation"}
              </button>
              {editingEmail && <button type="button" className={secondaryButton} onClick={() => setEditingEmail(false)}>Cancel</button>}
            </div>
          </form>
        )}
      </ChannelCard>

      {/* History */}
      <section aria-label="Delivery history" className="border-t border-border px-4 sm:px-6 py-5">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-accent" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Recent deliveries</h4>
        </div>
        {data.history.length === 0 ? (
          <p className="text-[10px] font-bold text-foreground/40">Nothing sent yet. Alerts and test messages will appear here.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {data.history.map((item) => (
              <li key={item.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[10px] font-bold text-foreground/80">
                    <span className="mr-2 text-[8px] font-black uppercase tracking-widest text-foreground/40">{item.channel === "TELEGRAM" ? "Telegram" : "Email"}</span>
                    {EVENT_LABEL[item.type]}{item.subject ? ` · ${item.subject}` : ""}
                  </p>
                  <span className={cn("shrink-0 rounded-sm border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest", STATUS_STYLE[item.status])}>{STATUS_LABEL[item.status]}</span>
                </div>
                <p className="mt-0.5 text-[9px] font-bold text-foreground/40">
                  {timeAgo(item.createdAt)}
                  {item.status === "PENDING" && item.attempts > 0 ? ` · retrying (attempt ${item.attempts})` : ""}
                  {item.error ? ` · ${item.error}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
