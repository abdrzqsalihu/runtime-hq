import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { IncidentSeverity } from "@prisma/client";

const createEventSchema = z.object({
  message: z.string().min(1).max(1000),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  region: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const incident = await prisma.incident.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!incident) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const event = await prisma.incidentEvent.create({
    data: {
      incidentId: id,
      message: parsed.data.message,
      severity: parsed.data.severity,
      region: parsed.data.region,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
