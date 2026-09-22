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
      select: {
        lastLatencyMs: true,
        status: true,
        _count: { select: { checks: true } },
      },
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

  // A service with zero checks has never been verified, so it must not count
  // toward the operational ratio in either direction (as healthy or as failing).
  const checkedServices = services.filter((s) => s._count.checks > 0);
  const operationalCount = checkedServices.filter((s) => s.status === ServiceStatus.OPERATIONAL).length;
  const uptimePercent =
    checkedServices.length > 0
      ? Number(((operationalCount / checkedServices.length) * 100).toFixed(2))
      : null;

  return NextResponse.json({
    kpi: {
      totalUptimePercent: uptimePercent,
      activeServices: serviceCount,
      avgResponseTimeMs: avgLatencyMs,
      activeIncidents,
    },
  });
}
