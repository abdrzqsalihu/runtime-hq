import { prisma } from "@/lib/db";
import { Prisma, ServiceStatus, IncidentStatus, IncidentSeverity } from "@prisma/client";
import { failureThreshold } from "@/lib/notifications/config";
import { enqueueIncidentEvent } from "@/lib/notifications/outbox";

type Tx = Prisma.TransactionClient;

// Concurrent checks of one service queue on a row lock, so allow time to acquire a connection and the lock.
const TX_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

/**
 * Shape returned by the incident helpers, which include the incident's linked services and events.
 */
export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: { services: { include: { service: true } }; events: true };
}>;

const withRelations = {
  services: { include: { service: true } },
  events: { orderBy: { timestamp: "desc" as const } },
} satisfies Prisma.IncidentInclude;

/**
 * Serialise incident changes for one service. Concurrent checks of the same service queue on this
 * row lock, so the find-then-create/resolve steps below cannot interleave and produce duplicates.
 * Returns false when the service no longer exists.
 */
async function lockService(tx: Tx, serviceId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Service" WHERE "id" = ${serviceId} FOR UPDATE
  `;
  return rows.length > 0;
}

/**
 * The open incident the monitoring engine created for a service, if any.
 * Manually declared incidents are never returned: recovery must not resolve them.
 */
async function findActiveAutomaticIncident(tx: Tx, serviceId: string) {
  return tx.incident.findFirst({
    where: {
      automatic: true,
      status: { not: IncidentStatus.RESOLVED },
      services: { some: { serviceId } },
    },
    orderBy: { startedAt: "desc" },
  });
}

function statusToSeverity(status: ServiceStatus): IncidentSeverity {
  if (status === ServiceStatus.OUTAGE) return IncidentSeverity.CRITICAL;
  if (status === ServiceStatus.DEGRADED) return IncidentSeverity.MEDIUM;
  return IncidentSeverity.LOW;
}

function formatDuration(startedAt: Date, now: Date): string {
  const totalSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

/**
 * Open or resolve the automatic incident for a service after a check has been recorded.
 *
 * - Failing: an incident opens once the last `failureThreshold()` checks (including this one) have all
 *   failed and none is already open. Its start time is the first check of that failing run.
 * - Healthy: an open automatic incident is resolved.
 *
 * The decision is made from recorded check history under a per-service row lock, so concurrent or
 * repeated checks cannot open two incidents or resolve one twice. The notification for each
 * transition is written to the outbox in the same transaction (see notifications/outbox.ts);
 * delivery happens later and can never block or fail a check.
 */
export async function handleServiceStatusTransition(
  serviceId: string,
  serviceName: string,
  userId: string,
  newStatus: ServiceStatus
): Promise<void> {
  const isFailing = newStatus !== ServiceStatus.OPERATIONAL;
  const threshold = failureThreshold();

  await prisma.$transaction(async (tx) => {
    if (!(await lockService(tx, serviceId))) return;

    const existing = await findActiveAutomaticIncident(tx, serviceId);

    if (isFailing) {
      if (existing) return;

      const recent = await tx.serviceCheck.findMany({
        where: { serviceId },
        orderBy: { checkedAt: "desc" },
        take: threshold,
        select: { status: true, checkedAt: true },
      });
      if (recent.length < threshold || recent.some((check) => check.status === ServiceStatus.OPERATIONAL)) return;

      const service = await tx.service.findUnique({ where: { id: serviceId }, select: { endpointUrl: true } });
      const severity = statusToSeverity(newStatus);
      const startedAt = recent[recent.length - 1].checkedAt;
      const incident = await tx.incident.create({
        data: {
          title: newStatus === ServiceStatus.OUTAGE ? `${serviceName} Outage` : `${serviceName} Degraded`,
          severity,
          status: IncidentStatus.INVESTIGATING,
          startedAt,
          automatic: true,
          userId,
          services: { create: [{ serviceId }] },
          events: {
            create: [
              {
                message: `Outage detected: ${newStatus === ServiceStatus.OUTAGE ? "Service unavailable" : "Service degraded"}`,
                severity,
              },
            ],
          },
        },
      });
      await enqueueIncidentEvent(tx, {
        type: "INCIDENT_OPENED",
        userId,
        incident,
        services: [{ name: serviceName, url: service?.endpointUrl ?? "" }],
        occurredAt: new Date(),
      });
      return;
    }

    // Healthy again: resolve the automatic incident
    if (!existing) return;
    const now = new Date();
    const resolved = await tx.incident.updateMany({
      where: { id: existing.id, status: { not: IncidentStatus.RESOLVED } },
      data: { status: IncidentStatus.RESOLVED, resolvedAt: now },
    });
    if (resolved.count === 0) return;

    await tx.incidentEvent.create({
      data: {
        incidentId: existing.id,
        message: `Service recovered and incident automatically resolved (duration: ${formatDuration(existing.startedAt, now)})`,
        severity: IncidentSeverity.LOW,
      },
    });
    const service = await tx.service.findUnique({ where: { id: serviceId }, select: { endpointUrl: true } });
    await enqueueIncidentEvent(tx, {
      type: "INCIDENT_RESOLVED",
      userId,
      incident: { ...existing, resolvedAt: now },
      services: [{ name: serviceName, url: service?.endpointUrl ?? "" }],
      occurredAt: now,
    });
  }, TX_OPTIONS);
}

/**
 * Change an incident's status and keep its invariants consistent:
 * - RESOLVED sets `resolvedAt` and records a timeline event
 * - leaving RESOLVED clears `resolvedAt` and records a timeline event
 * - other transitions record the change
 * For incidents the monitoring engine opened, resolving queues a recovery notification (if the
 * user was alerted) and reopening starts a new notification cycle with a fresh alert.
 * Returns null when the incident doesn't exist.
 */
export async function setIncidentStatus(
  incidentId: string,
  newStatus: IncidentStatus
): Promise<IncidentWithRelations | null> {
  return prisma.$transaction(async (tx) => {
    // Serialise concurrent status changes of the same incident
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Incident" WHERE "id" = ${incidentId} FOR UPDATE`;
    if (locked.length === 0) return null;
    const current = await tx.incident.findUniqueOrThrow({
      where: { id: incidentId },
      include: { services: { include: { service: { select: { name: true, endpointUrl: true } } } } },
    });

    if (current.status !== newStatus) {
      const resolving = newStatus === IncidentStatus.RESOLVED;
      const reopening = current.status === IncidentStatus.RESOLVED;
      const now = new Date();
      const notifyCycle = reopening && current.automatic ? current.notifyCycle + 1 : current.notifyCycle;

      const updated = await tx.incident.update({
        where: { id: incidentId },
        data: {
          status: newStatus,
          resolvedAt: resolving ? now : reopening ? null : current.resolvedAt,
          notifyCycle,
        },
      });

      await tx.incidentEvent.create({
        data: {
          incidentId,
          message: resolving
            ? "Incident resolved"
            : reopening
              ? `Incident reopened (status: ${newStatus})`
              : `Status changed to ${newStatus}`,
          severity: current.severity,
        },
      });

      if (current.automatic && (resolving || reopening)) {
        await enqueueIncidentEvent(tx, {
          type: resolving ? "INCIDENT_RESOLVED" : "INCIDENT_OPENED",
          userId: current.userId,
          incident: updated,
          services: current.services.map((link) => ({ name: link.service.name, url: link.service.endpointUrl })),
          occurredAt: now,
        });
      }
    }

    return tx.incident.findUniqueOrThrow({ where: { id: incidentId }, include: withRelations });
  }, TX_OPTIONS);
}

/**
 * Delete a service without leaving an active incident that has no service.
 * - An open incident that only affected this service is closed, with a timeline event.
 * - An open incident that affects other services stays open and records the removal.
 * Incident rows and events are kept either way. No notification is sent: deleting a service
 * is an administrative action, not a recovery.
 */
export async function deleteServiceAndCloseIncidents(serviceId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true },
    });
    if (!service) return false;

    const links = await tx.incidentService.findMany({
      where: { serviceId, incident: { status: { not: IncidentStatus.RESOLVED } } },
      include: { incident: { include: { _count: { select: { services: true } } } } },
    });

    const now = new Date();
    for (const link of links) {
      const onlyThisService = link.incident._count.services <= 1;
      if (onlyThisService) {
        await tx.incident.update({
          where: { id: link.incidentId },
          data: { status: IncidentStatus.RESOLVED, resolvedAt: now },
        });
      }
      await tx.incidentEvent.create({
        data: {
          incidentId: link.incidentId,
          message: onlyThisService
            ? `Service ${service.name} was deleted; incident closed`
            : `Service ${service.name} was deleted and removed from this incident`,
          severity: IncidentSeverity.LOW,
        },
      });
    }

    // Cascades to ServiceCheck and IncidentService rows; Incident and IncidentEvent rows remain.
    await tx.service.delete({ where: { id: serviceId } });
    return true;
  }, TX_OPTIONS);
}
