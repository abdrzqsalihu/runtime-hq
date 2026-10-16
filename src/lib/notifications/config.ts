import { timingSafeEqual } from "node:crypto";

/** Public base URL of the app, used for dashboard links in notifications. */
export function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "https://runtime-hq.vercel.app";
  return raw.replace(/\/+$/, "");
}

export function telegramToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function telegramWebhookSecret(): string | null {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || null;
}

/** Overridable only so tests and local fakes can stand in for the real providers. */
export function telegramApiBase(): string {
  return (process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org").replace(/\/+$/, "");
}

export function brevoApiBase(): string {
  return (process.env.BREVO_API_BASE_URL || "https://api.brevo.com").replace(/\/+$/, "");
}

export function brevoConfig(): { apiKey: string; senderEmail: string; senderName: string } | null {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) return null;
  return { apiKey, senderEmail, senderName: process.env.BREVO_SENDER_NAME?.trim() || "Runtime HQ" };
}

/** Telegram needs both the bot token and the webhook secret (linking relies on the webhook). */
export function isTelegramConfigured(): boolean {
  return !!telegramToken() && !!telegramWebhookSecret();
}

export function isEmailConfigured(): boolean {
  return brevoConfig() !== null;
}

/** Consecutive failed checks before an incident (and its notification) is opened. */
export function failureThreshold(): number {
  const raw = Number(process.env.INCIDENT_FAILURE_THRESHOLD);
  return Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : 2;
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
