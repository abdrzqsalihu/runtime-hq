import { prisma } from "@/lib/db";
import { ERROR_MESSAGES } from "./types";

/**
 * Persisted delivery state of the alerts for one incident. Only states that exist in the outbox are
 * returned: queued/sending (PENDING, PROCESSING), SENT (the provider accepted it), DELIVERED
 * (email only: Brevo's webhook confirmed it), FAILED and SKIPPED.
 */
export async function getIncidentNotifications(userId: string, incidentId: string) {
  const deliveries = await prisma.notificationDelivery.findMany({
    where: { userId, event: { incidentId, type: { in: ["INCIDENT_OPENED", "INCIDENT_RESOLVED"] } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      channel: true,
      status: true,
      attempts: true,
      lastError: true,
      createdAt: true,
      sentAt: true,
      deliveredAt: true,
      event: { select: { type: true } },
    },
  });
  return deliveries.map((d) => ({
    id: d.id,
    kind: d.event.type === "INCIDENT_OPENED" ? ("DOWN" as const) : ("RECOVERY" as const),
    channel: d.channel,
    status: d.status,
    attempts: d.attempts,
    error: d.lastError ? (ERROR_MESSAGES[d.lastError] ?? "Delivery failed.") : null,
    createdAt: d.createdAt,
    sentAt: d.sentAt,
    deliveredAt: d.deliveredAt,
  }));
}
