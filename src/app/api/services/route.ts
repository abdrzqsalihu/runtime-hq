import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ServiceStatus } from "@prisma/client/index.js";

const createServiceSchema = z.object({
  slug: z.string().min(2).max(64),
  name: z.string().min(2).max(128),
  category: z.string().min(2).max(64),
  endpointUrl: z.string().url(),
  region: z.string().min(2).max(64),
  status: z.nativeEnum(ServiceStatus).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { userId: session.user.id },
    include: {
      checks: {
        orderBy: { checkedAt: "desc" },
        take: 10,
      },
      incidentLinks: {
        include: { incident: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const created = await prisma.service.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      category: parsed.data.category,
      endpointUrl: parsed.data.endpointUrl,
      region: parsed.data.region,
      status: parsed.data.status ?? ServiceStatus.OPERATIONAL,
      lastHeartbeatAt: new Date(),
      userId: session.user.id,
    },
  });

  return NextResponse.json({ service: created }, { status: 201 });
}
