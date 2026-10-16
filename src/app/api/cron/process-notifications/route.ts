import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/notifications/config";
import { processNotificationOutbox } from "@/lib/notifications/outbox";

export const maxDuration = 60;

/**
 * Deliver due notifications (first attempts and retries). Same bearer-secret protection as the
 * check scheduler. Point a scheduler at this more often than the check run if retries should be quicker.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SERVER_MISCONFIGURED", message: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(provided, secret)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const summary = await processNotificationOutbox({ limit: 50 });
  return NextResponse.json({ success: true, ...summary });
}
