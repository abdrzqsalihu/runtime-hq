import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const incident = await prisma.incident.findUnique({
    where: { id },
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
  const { id } = await context.params;
  const body = await req.json().catch(() => null);

  if (!body || !body.status) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "status is required" },
      { status: 400 }
    );
  }

  const incident = await prisma.incident.update({
    where: { id },
    data: { status: body.status },
    include: {
      services: { include: { service: true } },
      events: { orderBy: { timestamp: "desc" } },
    },
  });

  return NextResponse.json({ incident });
}
