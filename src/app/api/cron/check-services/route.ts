import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkService } from "@/lib/health-check";
import { processNotificationOutbox } from "@/lib/notifications/outbox";
import { canCheckNow, markCheckInProgress, recordCheckComplete } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SERVER_MISCONFIGURED", message: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    select: { id: true },
  });

  const results = await Promise.all(
    services.map(async (service) => {
      // Skip a service that's already being checked (e.g. an overlapping cron
      // invocation) to avoid racing two concurrent incident-detection passes
      // for the same service. Reuses the same guard the manual CHECK NOW
      // endpoint already relies on.
      if (!canCheckNow(service.id)) {
        return { serviceId: service.id, skipped: true };
      }

      try {
        markCheckInProgress(service.id);
        const result = await checkService(service.id);
        recordCheckComplete(service.id);
        return result;
      } catch (err) {
        recordCheckComplete(service.id);
        return { error: err instanceof Error ? err.message : "Check failed", serviceId: service.id };
      }
    })
  );

  // Notification delivery is separate from monitoring: checks and incidents are already recorded above,
  // and a provider outage here only delays notifications (they stay queued and are retried).
  let notifications: Awaited<ReturnType<typeof processNotificationOutbox>> | { error: string } | undefined;
  try {
    notifications = await processNotificationOutbox();
  } catch (err) {
    console.error("Notification processing failed", err instanceof Error ? err.name : "error");
    notifications = { error: "NOTIFICATION_PROCESSING_FAILED" };
  }

  return NextResponse.json({ success: true, checked: results.length, results, notifications });
}
