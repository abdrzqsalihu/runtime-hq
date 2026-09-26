import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateMonitoringUrl } from "@/lib/url-safety";
import { deleteServiceAndCloseIncidents } from "@/lib/incident-manager";
import { DETAIL_CHECK_LIMIT, recentChecksByService, uptime24hByService } from "@/lib/service-queries";

// Monitoring status is owned by the check engine, so it is not updatable here.
const updateServiceSchema = z.object({
  name: z.string().min(2).max(128).optional(),
  category: z.string().min(2).max(64).optional(),
  endpointUrl: z.string().min(1).max(2048).optional(),
  region: z.string().min(2).max(64).optional(),
});

/** Resolve by id, then by slug, scoped to the signed-in user. */
async function findOwnedServiceId(idOrSlug: string, userId: string): Promise<string | null> {
  const byId = await prisma.service.findFirst({
    where: { id: idOrSlug, userId },
    select: { id: true },
  });
  if (byId) return byId.id;

  const bySlug = await prisma.service.findFirst({
    where: { slug: idOrSlug, userId },
    select: { id: true },
  });
  return bySlug?.id ?? null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { serviceId } = await context.params;
  const id = await findOwnedServiceId(serviceId, session.user.id);
  if (!id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const [service, checks, totalChecks, uptime] = await Promise.all([
    prisma.service.findUniqueOrThrow({
      where: { id },
      include: { incidentLinks: { include: { incident: true } } },
    }),
    recentChecksByService([id], DETAIL_CHECK_LIMIT),
    prisma.serviceCheck.count({ where: { serviceId: id } }),
    uptime24hByService([id]),
  ]);

  return NextResponse.json({
    service: {
      ...service,
      checks: checks.get(id) ?? [],
      totalChecks,
      uptime24h: uptime.get(id)?.uptimePercent ?? null,
      checks24h: uptime.get(id)?.checks24h ?? 0,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { serviceId } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const id = await findOwnedServiceId(serviceId, session.user.id);
  if (!id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const data: typeof parsed.data = { ...parsed.data };
  if (data.endpointUrl !== undefined) {
    const url = await validateMonitoringUrl(data.endpointUrl);
    if (!url.ok) {
      return NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: url.reason,
          issues: [{ path: ["endpointUrl"], message: url.reason }],
        },
        { status: 400 }
      );
    }
    data.endpointUrl = url.url.toString();
  }

  const updated = await prisma.service.update({ where: { id }, data });

  return NextResponse.json({ service: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { serviceId } = await context.params;
  const id = await findOwnedServiceId(serviceId, session.user.id);
  if (!id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Closes open incidents that only affected this service, then deletes it. Checks and incident
  // links cascade; incident and event rows are kept as history.
  const deleted = await deleteServiceAndCloseIncidents(id);
  if (!deleted) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
