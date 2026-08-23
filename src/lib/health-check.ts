import { prisma } from "@/lib/db";
import { ServiceStatus } from "@prisma/client/index.js";
import { handleServiceStatusTransition } from "@/lib/incident-manager";

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

export interface CheckResult {
  serviceId: string;
  status: ServiceStatus;
  latencyMs: number;
  httpStatus: number | null;
  errorRate: number;
  message: string;
  checkedAt: Date;
}

export async function checkService(serviceId: string): Promise<CheckResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, endpointUrl: true, status: true },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const previousStatus = service.status;
  const check = await checkUrl(service.endpointUrl, 3000);
  const newStatus = mapStatus(check.httpStatus, check.ok);
  const errorRate = check.ok ? 0 : 100;
  const now = new Date();

  await prisma.$transaction([
    prisma.serviceCheck.create({
      data: {
        serviceId: service.id,
        status: newStatus,
        latencyMs: check.latencyMs,
        httpStatus: check.httpStatus ?? undefined,
        errorRate,
        message: check.ok ? "OK" : "CHECK_FAILED",
      },
    }),
    prisma.service.update({
      where: { id: service.id },
      data: {
        status: newStatus,
        lastHeartbeatAt: now,
        lastLatencyMs: check.latencyMs,
        lastErrorRate: errorRate,
      },
    }),
  ]);

  // Handle automatic incident detection and resolution
  await handleServiceStatusTransition(
    service.id,
    service.name,
    previousStatus,
    newStatus
  );

  return {
    serviceId: service.id,
    status: newStatus,
    latencyMs: check.latencyMs,
    httpStatus: check.httpStatus,
    errorRate,
    message: check.ok ? "OK" : "CHECK_FAILED",
    checkedAt: now,
  };
}
