import { prisma } from "@/lib/db";
import { ServiceStatus } from "@prisma/client/index.js";
import { handleServiceStatusTransition } from "@/lib/incident-manager";
import { guardedRequest, GuardedRequestError, type FailureKind } from "@/lib/url-safety";

const CHECK_TIMEOUT_MS = 3000;

/** Stored in ServiceCheck.message. "OK" for success, otherwise why the check failed. */
export type CheckMessage = "OK" | "HTTP_ERROR" | FailureKind;

async function checkUrl(url: string) {
  const started = Date.now();
  try {
    const res = await guardedRequest(url, { timeoutMs: CHECK_TIMEOUT_MS, maxRedirects: 5 });
    return {
      ok: res.status >= 200 && res.status < 300,
      httpStatus: res.status,
      latencyMs: res.latencyMs,
      failure: null as FailureKind | null,
    };
  } catch (err) {
    const failure: FailureKind = err instanceof GuardedRequestError ? err.kind : "NETWORK_ERROR";
    return {
      ok: false,
      httpStatus: null as number | null,
      latencyMs: Date.now() - started,
      failure,
    };
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
  message: CheckMessage;
  checkedAt: Date;
}

export async function checkService(serviceId: string): Promise<CheckResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, endpointUrl: true, status: true, userId: true },
  });

  if (!service) {
    throw new Error("Service not found");
  }

  const previousStatus = service.status;
  const check = await checkUrl(service.endpointUrl);
  const newStatus = mapStatus(check.httpStatus, check.ok);
  const errorRate = check.ok ? 0 : 100;
  const message: CheckMessage = check.ok ? "OK" : (check.failure ?? "HTTP_ERROR");
  const now = new Date();

  await prisma.$transaction([
    prisma.serviceCheck.create({
      data: {
        serviceId: service.id,
        checkedAt: now,
        status: newStatus,
        latencyMs: check.latencyMs,
        httpStatus: check.httpStatus ?? undefined,
        errorRate,
        message,
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
    service.userId,
    previousStatus,
    newStatus
  );

  return {
    serviceId: service.id,
    status: newStatus,
    latencyMs: check.latencyMs,
    httpStatus: check.httpStatus,
    errorRate,
    message,
    checkedAt: now,
  };
}
