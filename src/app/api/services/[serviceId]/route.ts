import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ServiceStatus } from "@prisma/client/index.js";

const updateServiceSchema = z.object({
  name: z.string().min(2).max(128).optional(),
  category: z.string().min(2).max(64).optional(),
  endpointUrl: z.string().url().optional(),
  region: z.string().min(2).max(64).optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { serviceId } = await context.params;

  let service = await prisma.service.findFirst({
    where: { id: serviceId, userId: session.user.id },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 50 },
      incidentLinks: true,
    },
  });

  if (!service) {
    service = await prisma.service.findFirst({
      where: { slug: serviceId, userId: session.user.id },
      include: {
        checks: { orderBy: { checkedAt: "desc" }, take: 50 },
        incidentLinks: true,
      },
    });
  }

  if (!service) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const incidentIds = service.incidentLinks.map((il) => il.incidentId);
  let incidents: any[] = [];
  if (incidentIds.length > 0) {
    incidents = await prisma.incident.findMany({
      where: { id: { in: incidentIds } },
    });
  }
  (service as any).incidentLinks = service.incidentLinks.map((il) => ({
    ...il,
    incident: incidents.find((i) => i.id === il.incidentId),
  }));

  return NextResponse.json({ service });
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

  let service = await prisma.service.findFirst({
    where: { id: serviceId, userId: session.user.id },
    select: { id: true },
  });

  if (!service) {
    service = await prisma.service.findFirst({
      where: { slug: serviceId, userId: session.user.id },
      select: { id: true },
    });
  }

  if (!service) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: parsed.data,
  });

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

  let service = await prisma.service.findFirst({
    where: { id: serviceId, userId: session.user.id },
    select: { id: true },
  });

  if (!service) {
    service = await prisma.service.findFirst({
      where: { slug: serviceId, userId: session.user.id },
      select: { id: true },
    });
  }

  if (!service) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Cascades to ServiceCheck (deleted) and IncidentService join rows
  // (deleted) via the schema's onDelete: Cascade. Incident and IncidentEvent
  // rows are untouched, preserving incident history.
  await prisma.service.delete({ where: { id: service.id } });

  return NextResponse.json({ success: true });
}
