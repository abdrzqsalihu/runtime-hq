import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { IncidentStatus, ServiceStatus } from "@prisma/client/index.js";

export async function GET() {
  const [serviceCount, services, activeIncidents] = await Promise.all([
    prisma.service.count(),
    prisma.service.findMany({
      select: { lastLatencyMs: true, status: true },
    }),
    prisma.incident.count({
      where: { status: { not: IncidentStatus.RESOLVED } },
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
