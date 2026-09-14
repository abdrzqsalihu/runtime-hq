import { prisma } from "@/lib/db";
import { Prisma, ServiceStatus, IncidentStatus, IncidentSeverity, Incident } from "@prisma/client";

/**
 * Shape returned by createAutoIncident/resolveAutoIncident, which both
 * include the incident's linked services and events.
 */
type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: { services: true; events: true };
}>;

/**
 * Find the active (non-resolved) incident for a service.
 * Returns null if no active incident exists.
 */
export async function findActiveIncidentForService(
  serviceId: string
): Promise<Incident | null> {
  return await prisma.incident.findFirst({
    where: {
      status: { not: IncidentStatus.RESOLVED },
      services: {
        some: { serviceId },
      },
    },
  });
}

/**
 * Determine severity based on service status.
 */
function statusToSeverity(status: ServiceStatus): IncidentSeverity {
  if (status === ServiceStatus.OUTAGE) return IncidentSeverity.CRITICAL;
  if (status === ServiceStatus.DEGRADED) return IncidentSeverity.MEDIUM;
  return IncidentSeverity.LOW;
}

/**
 * Create an automatic incident when a service fails.
 * This incident is marked as auto-detected through the initial IncidentEvent message.
 */
export async function createAutoIncident(
  serviceId: string,
  serviceName: string,
  userId: string,
  status: ServiceStatus
): Promise<IncidentWithRelations> {
  const severity = statusToSeverity(status);
  const title =
    status === ServiceStatus.OUTAGE
      ? `${serviceName} Outage`
      : `${serviceName} Degraded`;

  const incident = await prisma.incident.create({
    data: {
      title,
      severity,
      status: IncidentStatus.INVESTIGATING,
      startedAt: new Date(),
      userId,
      services: {
        create: [{ serviceId }],
      },
      events: {
        create: [
          {
            message: `Outage detected: ${status === ServiceStatus.OUTAGE ? "Service unavailable" : "Service degraded"}`,
            severity,
          },
        ],
      },
    },
    include: {
      services: true,
      events: true,
    },
  });

  return incident;
}

/**
 * Resolve an active incident when a service recovers.
 */
export async function resolveAutoIncident(incident: Incident): Promise<IncidentWithRelations> {
  const now = new Date();
  const duration = now.getTime() - new Date(incident.startedAt).getTime();
  const durationMs = Math.round(duration / 1000);
  const minutes = Math.floor(durationMs / 60);
  const seconds = durationMs % 60;
  const durationStr = `${minutes}m ${seconds}s`;

  const resolved = await prisma.incident.update({
    where: { id: incident.id },
    data: {
      status: IncidentStatus.RESOLVED,
      resolvedAt: now,
    },
    include: {
      services: true,
      events: true,
    },
  });

  // Create recovery event
  await prisma.incidentEvent.create({
    data: {
      incidentId: incident.id,
      message: `Service recovered and incident automatically resolved (duration: ${durationStr})`,
      severity: IncidentSeverity.LOW,
    },
  });

  return resolved;
}

/**
 * Handle state transition detection and incident management.
 * Called after a health check updates the service status.
 */
export async function handleServiceStatusTransition(
  serviceId: string,
  serviceName: string,
  userId: string,
  previousStatus: ServiceStatus | null,
  newStatus: ServiceStatus
): Promise<void> {
  // No previous status means this is the first check
  if (!previousStatus) {
    return;
  }

  // Detect transition into failure
  const isNowFailing = newStatus !== ServiceStatus.OPERATIONAL;
  const wasHealthy = previousStatus === ServiceStatus.OPERATIONAL;

  if (isNowFailing && wasHealthy) {
    // Transition to failure: create incident if none exists
    const existingIncident = await findActiveIncidentForService(serviceId);
    if (!existingIncident) {
      await createAutoIncident(serviceId, serviceName, userId, newStatus);
    }
  }

  // Detect transition back to health
  const isNowHealthy = newStatus === ServiceStatus.OPERATIONAL;
  const wasUnhealthy = previousStatus !== ServiceStatus.OPERATIONAL;

  if (isNowHealthy && wasUnhealthy) {
    // Transition to healthy: resolve any active incident
    const activeIncident = await findActiveIncidentForService(serviceId);
    if (activeIncident) {
      await resolveAutoIncident(activeIncident);
    }
  }
}
