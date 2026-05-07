import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ServiceStatus } from "@prisma/client/index.js";

const createServiceSchema = z.object({
  slug: z.string().min(2).max(64),
  name: z.string().min(2).max(128),
  category: z.string().min(2).max(64),
  endpointUrl: z.string().url(),
  region: z.string().min(2).max(64),
  status: z.nativeEnum(ServiceStatus).optional(),
});

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ services });
}

export async function POST(req: Request) {
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
    },
  });

  return NextResponse.json({ service: created }, { status: 201 });
}
