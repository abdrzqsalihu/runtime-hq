import { telegramApiBase, telegramToken } from "./config";
import type { SendOutcome } from "./types";

const REQUEST_TIMEOUT_MS = 8000;

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
}

/** Telegram Bot API call. The token only ever lives in the URL of this server-side request. */
async function callTelegram(method: string, body: Record<string, unknown>): Promise<{ status: number; data: TelegramResponse | null }> {
  const token = telegramToken();
  if (!token) throw new TelegramNotConfiguredError();

  const res = await fetch(`${telegramApiBase()}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => null)) as TelegramResponse | null;
  return { status: res.status, data };
}

class TelegramNotConfiguredError extends Error {}

/**
 * Map a failed Bot API response to a delivery outcome.
 * - 429 and 5xx are transient (429 carries parameters.retry_after seconds).
 * - 403 (blocked by the user, deactivated, kicked) and 400 "chat not found" mean the chat is unusable.
 * - 401 means the bot token is wrong: a server configuration problem, not a chat problem.
 */
export function classifyTelegramFailure(status: number, data: TelegramResponse | null): SendOutcome {
  const code = data?.error_code ?? status;
  const description = (data?.description ?? "").toLowerCase();

  if (code === 429) {
    const seconds = data?.parameters?.retry_after;
    return { kind: "transient", code: "PROVIDER_RATE_LIMITED", retryAfterMs: seconds ? Math.min(seconds, 900) * 1000 : undefined };
  }
  if (code >= 500) return { kind: "transient", code: "PROVIDER_UNAVAILABLE" };
  if (code === 401) return { kind: "permanent", code: "PROVIDER_UNAUTHORIZED" };
  if (code === 403) return { kind: "permanent", code: "TELEGRAM_BLOCKED" };
  if (code === 400 && (description.includes("chat not found") || description.includes("user not found"))) {
    return { kind: "permanent", code: "TELEGRAM_CHAT_NOT_FOUND" };
  }
  return { kind: "permanent", code: "PROVIDER_REJECTED" };
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendOutcome> {
  if (!telegramToken()) return { kind: "skip", code: "NOT_CONFIGURED" };
  try {
    const { status, data } = await callTelegram("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    if (status === 200 && data?.ok) {
      const messageId = (data.result as { message_id?: number } | undefined)?.message_id;
      return { kind: "sent", providerMessageId: messageId !== undefined ? String(messageId) : undefined };
    }
    return classifyTelegramFailure(status, data);
  } catch (err) {
    if (err instanceof TelegramNotConfiguredError) return { kind: "skip", code: "NOT_CONFIGURED" };
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { kind: "transient", code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE" };
  }
}

let cachedUsername: { value: string; at: number } | null = null;

/** The bot's @username (needed for the t.me deep link), via getMe, cached for an hour. */
export async function getBotUsername(): Promise<string | null> {
  if (cachedUsername && Date.now() - cachedUsername.at < 3600_000) return cachedUsername.value;
  try {
    const { status, data } = await callTelegram("getMe", {});
    const username = (data?.result as { username?: string } | undefined)?.username;
    if (status === 200 && data?.ok && username) {
      cachedUsername = { value: username, at: Date.now() };
      return username;
    }
  } catch {
    // fall through
  }
  return null;
}

export function resetTelegramCacheForTests() {
  cachedUsername = null;
}

/** Subset of the Bot API Update object that the linking flow uses. */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
  };
  my_chat_member?: {
    chat: { id: number; type: string };
    new_chat_member?: { status?: string };
  };
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
