import { NextRequest, NextResponse } from "next/server";
import { IncidentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const incident = await prisma.incident.findUnique({
    where: { id },
  });

  if (!incident) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (incident.status === IncidentStatus.RESOLVED) {
    return NextResponse.json(
      { error: "ALREADY_RESOLVED", message: "Incident is already resolved" },
      { status: 400 }
    );
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: {
      status: IncidentStatus.RESOLVED,
      resolvedAt: new Date(),
    },
    include: {
      services: { include: { service: true } },
      events: { orderBy: { timestamp: "desc" } },
    },
  });

  // Create a timeline event for the resolution
  await prisma.incidentEvent.create({
    data: {
      incidentId: id,
      message: "Incident resolved",
      severity: updated.severity,
    },
  });

  return NextResponse.json({ incident: updated });
}
