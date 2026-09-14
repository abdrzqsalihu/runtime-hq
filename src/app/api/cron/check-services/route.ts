import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkService } from "@/lib/health-check";
import { canCheckNow, markCheckInProgress, recordCheckComplete } from "@/lib/rate-limit";

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

  return NextResponse.json({ success: true, checked: results.length, results });
}
