import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MAX_SERVICES_PER_USER, validateMonitoringUrl } from "@/lib/url-safety";
import { LIST_CHECK_LIMIT, recentChecksByService, uptime24hByService } from "@/lib/service-queries";

// Monitoring status is owned by the check engine, so the client cannot set it.
const createServiceSchema = z.object({
  slug: z.string().min(2).max(64),
  name: z.string().min(2).max(128),
  category: z.string().min(2).max(64),
  endpointUrl: z.string().min(1).max(2048),
  region: z.string().min(2).max(64).default("GLOBAL_EDGE"),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { userId: session.user.id },
    include: { incidentLinks: { include: { incident: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const ids = services.map((s) => s.id);
  const [checks, uptime] = await Promise.all([
    recentChecksByService(ids, LIST_CHECK_LIMIT),
    uptime24hByService(ids),
  ]);

  return NextResponse.json({
    services: services.map((service) => ({
      ...service,
      checks: checks.get(service.id) ?? [],
      uptime24h: uptime.get(service.id)?.uptimePercent ?? null,
      checks24h: uptime.get(service.id)?.checks24h ?? 0,
    })),
  });
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

  const url = await validateMonitoringUrl(parsed.data.endpointUrl);
  if (!url.ok) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: url.reason,
        issues: [{ path: ["endpointUrl"], message: url.reason }],
      },
      { status: 400 }
    );
  }

  const existingCount = await prisma.service.count({ where: { userId: session.user.id } });
  if (existingCount >= MAX_SERVICES_PER_USER) {
    return NextResponse.json(
      {
        error: "SERVICE_LIMIT_REACHED",
        message: `You can monitor up to ${MAX_SERVICES_PER_USER} services. Delete one to add another.`,
      },
      { status: 403 }
    );
  }

  try {
    // No status or heartbeat is set here: a new service has no check evidence until the first check.
    const created = await prisma.service.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        category: parsed.data.category,
        endpointUrl: url.url.toString(),
        region: parsed.data.region,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ service: created }, { status: 201 });
  } catch (err) {
    const target = err instanceof Prisma.PrismaClientKnownRequestError ? err.meta?.target : undefined;
    const targetsSlug =
      Array.isArray(target) ? target.includes("slug") : typeof target === "string" ? target.includes("slug") : false;

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && targetsSlug) {
      return NextResponse.json(
        {
          error: "INVALID_INPUT",
          message: "You already have a service with this name",
          issues: [
            {
              path: ["slug"],
              message: "You already have a service with this slug",
            },
          ],
        },
        { status: 400 }
      );
    }
    throw err;
  }
}
