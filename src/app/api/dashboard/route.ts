import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { IncidentStatus, ServiceStatus } from "@prisma/client/index.js";
import { UPTIME_WINDOW_MS } from "@/lib/service-queries";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = session.user.id;
  const since = new Date(Date.now() - UPTIME_WINDOW_MS);

  const [serviceCount, activeIncidents, statusCounts, latency] = await Promise.all([
    prisma.service.count({ where: { userId } }),
    prisma.incident.count({
      where: { userId, status: { not: IncidentStatus.RESOLVED } },
    }),
    // Persisted checks from the last 24 hours, by result. Bounded by the window, not by history.
    prisma.serviceCheck.groupBy({
      by: ["status"],
      where: { service: { userId }, checkedAt: { gte: since } },
      _count: { _all: true },
    }),
    // Response time is only meaningful when the service actually answered.
    prisma.serviceCheck.aggregate({
      where: { service: { userId }, checkedAt: { gte: since }, httpStatus: { not: null } },
      _avg: { latencyMs: true },
    }),
  ]);

  const checks24h = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const operational24h =
    statusCounts.find((row) => row.status === ServiceStatus.OPERATIONAL)?._count._all ?? 0;

  // Uptime = OPERATIONAL checks / all checks in the last 24 hours.
  // With no checks in the window there is no uptime to report (null), never a default.
  const uptimePercent =
    checks24h > 0 ? Number(((operational24h / checks24h) * 100).toFixed(2)) : null;

  const avgLatencyMs =
    latency._avg.latencyMs !== null ? Math.round(latency._avg.latencyMs) : null;

  return NextResponse.json({
    kpi: {
      uptime24hPercent: uptimePercent,
      checks24h,
      activeServices: serviceCount,
      avgResponseTimeMs: avgLatencyMs,
      activeIncidents,
    },
  });
}
