export type Channel = "EMAIL" | "TELEGRAM";

export interface IncidentPayload {
  kind: "incident";
  incidentId: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "CRITICAL";
  startedAt: string;
  resolvedAt?: string;
  durationSeconds?: number;
  occurredAt: string;
  services: Array<{ name: string; url: string }>;
}

export interface TestPayload {
  kind: "test";
}

export type EventPayload = IncidentPayload | TestPayload;

/**
 * Result of one provider attempt. Failure codes are short, stable and safe to store and show:
 * they never contain tokens, keys, chat ids or raw provider messages.
 */
export type SendOutcome =
  | { kind: "sent"; providerMessageId?: string }
  | { kind: "transient"; code: string; retryAfterMs?: number }
  | { kind: "permanent"; code: string }
  | { kind: "skip"; code: string };

export const ERROR_MESSAGES: Record<string, string> = {
  NOT_CONFIGURED: "The provider is not configured on this server.",
  CHANNEL_DISABLED: "This channel was turned off or disconnected.",
  EXPIRED: "The notification was too old to be useful and was dropped.",
  RETRIES_EXHAUSTED: "Delivery kept failing and was given up after several attempts.",
  PROVIDER_TIMEOUT: "The provider did not respond in time.",
  PROVIDER_RATE_LIMITED: "The provider rate-limited the request.",
  PROVIDER_UNAVAILABLE: "The provider had a temporary problem.",
  PROVIDER_REJECTED: "The provider rejected the message.",
  PROVIDER_UNAUTHORIZED: "The provider rejected the server's credentials.",
  TELEGRAM_BLOCKED: "Telegram reports the bot was blocked or the account is unavailable. Reconnect Telegram.",
  TELEGRAM_CHAT_NOT_FOUND: "Telegram can't find this chat. Reconnect Telegram.",
  EMAIL_SENDER_INVALID: "The sender address is not verified with the email provider.",
  EMAIL_RECIPIENT_INVALID: "The email provider rejected the recipient address.",
  RECOVERY_WITHOUT_ALERT: "No alert was delivered for this incident, so the recovery notice was skipped.",
  INCIDENT_ALREADY_RESOLVED: "The incident was resolved before this alert could be sent.",
};
