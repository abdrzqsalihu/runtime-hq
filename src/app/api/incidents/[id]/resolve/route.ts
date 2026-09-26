import { NextRequest, NextResponse } from "next/server";
import { IncidentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { setIncidentStatus } from "@/lib/incident-manager";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;

  const incident = await prisma.incident.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, status: true },
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

  const updated = await setIncidentStatus(id, IncidentStatus.RESOLVED);
  if (!updated) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ incident: updated });
}
