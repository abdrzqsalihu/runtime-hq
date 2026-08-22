import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkService } from "@/lib/health-check";
import { prisma } from "@/lib/db";
import { canCheckNow, getRemainingCooldown, markCheckInProgress, recordCheckComplete } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });

  if (!service) {
    service = await prisma.service.findUnique({
      where: { slug: serviceId },
      select: { id: true },
    });
  }

  if (!service) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const remaining = getRemainingCooldown(service.id);
  if (remaining === -1) {
    return NextResponse.json(
      {
        error: "CHECK_IN_PROGRESS",
        message: "A check is currently running for this service",
      },
      { status: 429 }
    );
  }

  if (!canCheckNow(service.id)) {
    const secondsRemaining = Math.ceil(remaining / 1000);
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: `Check completed recently. Try again in ${secondsRemaining} seconds.`,
        retryAfter: secondsRemaining,
      },
      { status: 429, headers: { "Retry-After": String(secondsRemaining) } }
    );
  }

  try {
    markCheckInProgress(service.id);

    const result = await checkService(service.id);

    recordCheckComplete(service.id);

    return NextResponse.json({ check: result }, { status: 200 });
  } catch (error) {
    recordCheckComplete(service.id);
    const message = error instanceof Error ? error.message : "Check failed";
    return NextResponse.json({ error: "CHECK_FAILED", message }, { status: 500 });
  }
}
