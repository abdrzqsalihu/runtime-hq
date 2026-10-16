import { NextRequest, NextResponse } from "next/server";
import { safeEqual, telegramWebhookSecret } from "@/lib/notifications/config";
import type { TelegramUpdate } from "@/lib/notifications/telegram";
import { handleTelegramUpdate } from "@/lib/notifications/webhooks";

/**
 * Telegram Bot API webhook. Telegram sends the secret configured in setWebhook back in the
 * X-Telegram-Bot-Api-Secret-Token header; anything without the right secret is rejected, and with
 * no secret configured the endpoint is disabled. Authentication of the user happens through the
 * single-use token inside the /start payload, never through anything the browser supplies.
 */
export async function POST(req: NextRequest) {
  const secret = telegramWebhookSecret();
  if (!secret) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  const provided = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(provided, secret)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update || typeof update.update_id !== "number") return NextResponse.json({ ok: true });

  try {
    await handleTelegramUpdate(update);
  } catch (err) {
    // Acknowledge anyway: a retried /start would only find its (single-use) token already consumed.
    console.error("Telegram update failed", err instanceof Error ? err.name : "error");
  }
  return NextResponse.json({ ok: true });
}
