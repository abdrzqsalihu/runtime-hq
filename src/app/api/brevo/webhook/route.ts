import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/notifications/config";
import { handleBrevoEvent } from "@/lib/notifications/webhooks";

/**
 * Brevo transactional webhook (delivered, bounced, blocked, ...). Brevo does not sign requests, so
 * the endpoint is protected by BREVO_WEBHOOK_SECRET, accepted as `Authorization: Bearer <secret>` or
 * as a `?secret=` query parameter on the webhook URL. Without the variable the endpoint is disabled.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.BREVO_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const provided = bearer || req.nextUrl.searchParams.get("secret") || "";
  if (!safeEqual(provided, secret)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const events = (Array.isArray(body) ? body : [body]).filter((e) => e && typeof e === "object");
  try {
    for (const event of events) await handleBrevoEvent(event);
  } catch (err) {
    console.error("Brevo webhook failed", err instanceof Error ? err.name : "error");
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 }); // Brevo retries failed webhooks
  }
  return NextResponse.json({ ok: true });
}
