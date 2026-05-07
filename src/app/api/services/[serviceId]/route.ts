import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ServiceStatus } from "@prisma/client/index.js";

const updateServiceSchema = z.object({
  name: z.string().min(2).max(128).optional(),
  category: z.string().min(2).max(64).optional(),
  endpointUrl: z.string().url().optional(),
  region: z.string().min(2).max(64).optional(),
  status: z.nativeEnum(ServiceStatus).optional(),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      checks: { orderBy: { checkedAt: "desc" }, take: 50 },
      incidentLinks: { include: { incident: true } },
    },
  });

  if (!service) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ service });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: parsed.data,
  });

  return NextResponse.json({ service: updated });
}
