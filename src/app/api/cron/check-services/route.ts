import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ServiceStatus } from "@prisma/client/index.js";

async function checkUrl(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { "user-agent": "pulse-os-monitor/1.0" },
    });
    const latencyMs = Date.now() - started;
    return { ok: res.ok, httpStatus: res.status, latencyMs };
  } catch {
    const latencyMs = Date.now() - started;
    return { ok: false, httpStatus: null as number | null, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

function mapStatus(httpStatus: number | null, ok: boolean) {
  if (ok) return ServiceStatus.OPERATIONAL;
  if (httpStatus === null) return ServiceStatus.OUTAGE;
  if (httpStatus >= 500) return ServiceStatus.OUTAGE;
  return ServiceStatus.DEGRADED;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const services = await prisma.service.findMany({
    select: { id: true, endpointUrl: true },
  });

  const results = await Promise.all(
    services.map(async (service) => {
      const check = await checkUrl(service.endpointUrl, 3000);
      const status = mapStatus(check.httpStatus, check.ok);
      const errorRate = check.ok ? 0 : 100;

      await prisma.$transaction([
        prisma.serviceCheck.create({
          data: {
            serviceId: service.id,
            status,
            latencyMs: check.latencyMs,
            httpStatus: check.httpStatus ?? undefined,
            errorRate,
            message: check.ok ? "OK" : "CHECK_FAILED",
          },
        }),
        prisma.service.update({
          where: { id: service.id },
          data: {
            status,
            lastHeartbeatAt: new Date(),
            lastLatencyMs: check.latencyMs,
            lastErrorRate: errorRate,
          },
        }),
      ]);

      return { serviceId: service.id, status, latencyMs: check.latencyMs };
    })
  );

  return NextResponse.json({ ok: true, results });
}
