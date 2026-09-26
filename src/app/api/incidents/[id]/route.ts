import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { IncidentStatus } from "@prisma/client";
import { setIncidentStatus } from "@/lib/incident-manager";

const updateIncidentSchema = z.object({ status: z.nativeEnum(IncidentStatus) });

export async function GET(
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
    include: {
      services: { include: { service: true } },
      events: { orderBy: { timestamp: "desc" } },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ incident });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = updateIncidentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: "status must be a valid incident status",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.incident.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const incident = await setIncidentStatus(id, parsed.data.status);
  if (!incident) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ incident });
}
