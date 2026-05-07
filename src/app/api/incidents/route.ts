import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { IncidentSeverity, IncidentStatus } from "@prisma/client/index.js";



const createIncidentSchema = z.object({
  title: z.string().min(3).max(256),
  severity: z.nativeEnum(IncidentSeverity),
  status: z.nativeEnum(IncidentStatus).optional(),
  serviceIds: z.array(z.string()).optional(),
  region: z.string().optional(),
  message: z.string().optional(),
});

export async function GET() {
  const incidents = await prisma.incident.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      services: { include: { service: true } },
      events: { orderBy: { timestamp: "desc" }, take: 20 },
    },
    take: 50,
  });
  return NextResponse.json({ incidents });
}

export async function POST(req: Request) {
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

  const incident = await prisma.incident.create({
    data: {
      title: parsed.data.title,
      severity: parsed.data.severity,
      status: parsed.data.status ?? IncidentStatus.INVESTIGATING,
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
