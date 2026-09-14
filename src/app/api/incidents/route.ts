import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { IncidentSeverity, IncidentStatus } from "@prisma/client/index.js";

const createIncidentSchema = z.object({
  title: z.string().min(3).max(256),
  severity: z.nativeEnum(IncidentSeverity),
  status: z.nativeEnum(IncidentStatus).optional(),
  serviceIds: z.array(z.string()).optional(),
  region: z.string().optional(),
  message: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const incidents = await prisma.incident.findMany({
    where: { userId: session.user.id },
    orderBy: { startedAt: "desc" },
    include: {
      services: { include: { service: true } },
      events: { orderBy: { timestamp: "desc" }, take: 20 },
    },
    take: 50,
  });
  return NextResponse.json({ incidents });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createIncidentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const uniqueServiceIds = parsed.data.serviceIds
    ? Array.from(new Set(parsed.data.serviceIds))
    : undefined;

  if (uniqueServiceIds?.length) {
    const ownedCount = await prisma.service.count({
      where: { id: { in: uniqueServiceIds }, userId: session.user.id },
    });
    if (ownedCount !== uniqueServiceIds.length) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "One or more services were not found" },
        { status: 400 }
      );
    }
  }

  const incident = await prisma.incident.create({
    data: {
      title: parsed.data.title,
      severity: parsed.data.severity,
      status: parsed.data.status ?? IncidentStatus.INVESTIGATING,
      userId: session.user.id,
      services: uniqueServiceIds?.length
        ? {
            createMany: {
              data: uniqueServiceIds.map((serviceId) => ({ serviceId })),
            },
          }
        : undefined,
      events: parsed.data.message
        ? {
            create: {
              message: parsed.data.message,
              region: parsed.data.region,
              severity: parsed.data.severity,
            },
          }
        : undefined,
    },
  });

  return NextResponse.json({ incident }, { status: 201 });
}
