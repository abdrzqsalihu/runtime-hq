import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { IncidentStatus, ServiceStatus } from "@prisma/client/index.js";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [serviceCount, services, activeIncidents] = await Promise.all([
    prisma.service.count({ where: { userId: session.user.id } }),
    prisma.service.findMany({
      where: { userId: session.user.id },
      select: { lastLatencyMs: true, status: true },
    }),
    prisma.incident.count({
      where: { userId: session.user.id, status: { not: IncidentStatus.RESOLVED } },
    }),
  ]);

  const latencyValues = services
    .map((s) => s.lastLatencyMs)
    .filter((v): v is number => typeof v === "number");

  const avgLatencyMs =
    latencyValues.length > 0
      ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
      : null;

  const operationalCount = services.filter((s) => s.status === ServiceStatus.OPERATIONAL).length;
  const uptimePercent =
    serviceCount > 0
      ? Number(((operationalCount / serviceCount) * 100).toFixed(2))
      : 0;

  return NextResponse.json({
    kpi: {
      totalUptimePercent: uptimePercent,
      activeServices: serviceCount,
      avgResponseTimeMs: avgLatencyMs,
      activeIncidents,
    },
  });
}
