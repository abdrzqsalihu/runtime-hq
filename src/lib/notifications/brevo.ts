import { brevoApiBase, brevoConfig } from "./config";
import type { SendOutcome } from "./types";

const REQUEST_TIMEOUT_MS = 8000;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface BrevoError {
  code?: string;
  message?: string;
}

/**
 * Map a failed Brevo response to a delivery outcome.
 * - 429 and 5xx are transient. Brevo's rate-limit reset header is honoured when present.
 * - 400 is permanent; if the message points at the sender it is reported as a sender-configuration problem.
 * - 401/403 mean the API key is invalid or not allowed (server configuration), also permanent.
 */
export function classifyBrevoFailure(status: number, body: BrevoError | null, headers?: Headers): SendOutcome {
  if (status === 429) {
    const raw = headers?.get("retry-after") ?? headers?.get("x-sib-ratelimit-reset");
    const seconds = raw ? Number(raw) : NaN;
    return { kind: "transient", code: "PROVIDER_RATE_LIMITED", retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 900) * 1000 : undefined };
  }
  if (status >= 500) return { kind: "transient", code: "PROVIDER_UNAVAILABLE" };
  if (status === 401 || status === 403) return { kind: "permanent", code: "PROVIDER_UNAUTHORIZED" };
  if (status === 400) {
    const message = (body?.message ?? "").toLowerCase();
    if (message.includes("sender")) return { kind: "permanent", code: "EMAIL_SENDER_INVALID" };
    if (message.includes("recipient") || message.includes("to[") || message.includes("email address") || message.includes("invalid email")) {
      return { kind: "permanent", code: "EMAIL_RECIPIENT_INVALID" };
    }
  }
  return { kind: "permanent", code: "PROVIDER_REJECTED" };
}

/**
 * Send one transactional email through Brevo (POST /v3/smtp/email, `api-key` header).
 * "sent" means Brevo accepted the request (201 + messageId), not that the recipient received it;
 * delivery results arrive later through the Brevo webhook.
 */
export async function sendBrevoEmail(message: EmailMessage): Promise<SendOutcome> {
  const config = brevoConfig();
  if (!config) return { kind: "skip", code: "NOT_CONFIGURED" };

  try {
    const res = await fetch(`${brevoApiBase()}/v3/smtp/email`, {
      method: "POST",
      headers: { "api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        tags: ["runtime-hq"],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as (BrevoError & { messageId?: string }) | null;

    if (res.status === 201 || res.status === 200) {
      return { kind: "sent", providerMessageId: body?.messageId };
    }
    return classifyBrevoFailure(res.status, body, res.headers);
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { kind: "transient", code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE" };
  }
}

/** Brevo ids look like "<202510161200.123@smtp-relay.mailin.fr>"; compare them without brackets/case. */
export function normalizeMessageId(id: string): string {
  return id.trim().replace(/^<|>$/g, "").toLowerCase();
}
