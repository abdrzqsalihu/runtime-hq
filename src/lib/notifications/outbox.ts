import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeMessageId, sendBrevoEmail } from "./brevo";
import { renderEmail, renderTelegram } from "./templates";
import { sendTelegramMessage } from "./telegram";
import type { Channel, EventPayload, IncidentPayload, SendOutcome } from "./types";

type Tx = Prisma.TransactionClient;
type IncidentEventType = "INCIDENT_OPENED" | "INCIDENT_RESOLVED";

export const MAX_ATTEMPTS = 5;
const LOCK_MS = 90_000;
/** Alerts older than this are dropped: a "down" notice hours late is misleading. */
export const MAX_EVENT_AGE_MS = 6 * 60 * 60 * 1000;
const CLAIM_BATCH = 20;
const CONCURRENCY = 5;

/** Bounded exponential backoff with jitter: ~1m, 2m, 4m, 8m (capped at 15m). */
export function backoffMs(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
  return Math.round(base * (0.9 + random() * 0.2));
}

export const openedKey = (incidentId: string, cycle: number) => `inc:${incidentId}:c${cycle}:opened`;
export const resolvedKey = (incidentId: string, cycle: number) => `inc:${incidentId}:c${cycle}:resolved`;

interface ChannelPrefs {
  emailOnIncident: boolean;
  emailOnRecovery: boolean;
  telegramOnIncident: boolean;
  telegramOnRecovery: boolean;
  emailAddress: string | null;
  emailVerifiedAt: Date | null;
  telegramChatId: string | null;
  telegramStatus: "ACTIVE" | "BLOCKED" | "INVALID";
}

/** Channels that are configured AND opted in for this kind of event. */
export function channelsFor(settings: ChannelPrefs | null, type: IncidentEventType): Channel[] {
  if (!settings) return [];
  const channels: Channel[] = [];
  const email = !!settings.emailAddress && !!settings.emailVerifiedAt;
  const telegram = !!settings.telegramChatId && settings.telegramStatus === "ACTIVE";
  if (email && (type === "INCIDENT_OPENED" ? settings.emailOnIncident : settings.emailOnRecovery)) channels.push("EMAIL");
  if (telegram && (type === "INCIDENT_OPENED" ? settings.telegramOnIncident : settings.telegramOnRecovery)) channels.push("TELEGRAM");
  return channels;
}

/**
 * Record an incident notification in the outbox, inside the caller's transaction so the incident
 * change and its notification commit (or roll back) together. Idempotent: the same incident cycle
 * and kind can only ever produce one event, no matter how many times or how concurrently this runs.
 *
 * A resolved event is only created if an opened event exists for the same cycle, so a recovery
 * notice can never be sent for an incident the user was never alerted about.
 */
export async function enqueueIncidentEvent(
  tx: Tx,
  input: {
    type: IncidentEventType;
    userId: string;
    incident: { id: string; title: string; severity: IncidentPayload["severity"]; startedAt: Date; resolvedAt?: Date | null; notifyCycle: number };
    services: Array<{ name: string; url: string }>;
    occurredAt: Date;
  },
): Promise<{ created: boolean; channels: Channel[] }> {
  const { type, userId, incident } = input;
  const key = type === "INCIDENT_OPENED" ? openedKey(incident.id, incident.notifyCycle) : resolvedKey(incident.id, incident.notifyCycle);

  if (type === "INCIDENT_RESOLVED") {
    const opened = await tx.notificationEvent.findUnique({ where: { idempotencyKey: openedKey(incident.id, incident.notifyCycle) }, select: { id: true } });
    if (!opened) return { created: false, channels: [] };
  }

  const settings = await tx.notificationSettings.findUnique({ where: { userId } });
  const channels = channelsFor(settings, type);

  const payload: IncidentPayload = {
    kind: "incident",
    incidentId: incident.id,
    title: incident.title,
    severity: incident.severity,
    startedAt: incident.startedAt.toISOString(),
    occurredAt: input.occurredAt.toISOString(),
    services: input.services,
    ...(type === "INCIDENT_RESOLVED" && incident.resolvedAt
      ? { resolvedAt: incident.resolvedAt.toISOString(), durationSeconds: Math.max(0, Math.round((incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 1000)) }
      : {}),
  };

  const id = randomUUID();
  const inserted = await tx.notificationEvent.createMany({
    data: [{ id, userId, incidentId: incident.id, type, idempotencyKey: key, payload: payload as unknown as Prisma.InputJsonValue }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) return { created: false, channels: [] };

  if (channels.length > 0) {
    await tx.notificationDelivery.createMany({
      data: channels.map((channel) => ({ eventId: id, userId, channel })),
      skipDuplicates: true,
    });
  }
  return { created: true, channels };
}

interface ClaimedRow {
  id: string;
  eventId: string;
  userId: string;
  channel: Channel;
  attempts: number;
}

/**
 * Atomically claim due deliveries. FOR UPDATE SKIP LOCKED means concurrent workers never receive
 * the same row; a worker that died leaves a PROCESSING row whose lock expires and is then reclaimed.
 */
async function claimDue(now: Date, limit: number, onlyUserIds?: string[]): Promise<ClaimedRow[]> {
  const lockUntil = new Date(now.getTime() + LOCK_MS);
  const scope = onlyUserIds ? Prisma.sql`AND "userId" IN (${Prisma.join(onlyUserIds)})` : Prisma.empty;
  return prisma.$queryRaw<ClaimedRow[]>`
    UPDATE "NotificationDelivery" d
    SET "status" = 'PROCESSING', "lockedUntil" = ${lockUntil}, "attempts" = d."attempts" + 1, "updatedAt" = ${now}
    WHERE d."id" IN (
      SELECT "id" FROM "NotificationDelivery"
      WHERE (("status" = 'PENDING' AND "nextAttemptAt" <= ${now})
         OR ("status" = 'PROCESSING' AND "lockedUntil" < ${now}))
         ${scope}
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING d."id", d."eventId", d."userId", d."channel"::text AS "channel", d."attempts"
  `;
}

/** Send one rendered notification through its provider, re-checking the user's current settings first. */
export async function sendThroughChannel(
  channel: Channel,
  userId: string,
  event: { type: "INCIDENT_OPENED" | "INCIDENT_RESOLVED" | "TEST"; payload: EventPayload },
): Promise<SendOutcome> {
  const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
  if (!settings) return { kind: "skip", code: "CHANNEL_DISABLED" };

  if (channel === "TELEGRAM") {
    if (!settings.telegramChatId || settings.telegramStatus !== "ACTIVE") return { kind: "skip", code: "CHANNEL_DISABLED" };
    if (event.type === "INCIDENT_OPENED" && !settings.telegramOnIncident) return { kind: "skip", code: "CHANNEL_DISABLED" };
    if (event.type === "INCIDENT_RESOLVED" && !settings.telegramOnRecovery) return { kind: "skip", code: "CHANNEL_DISABLED" };
    const outcome = await sendTelegramMessage(settings.telegramChatId, renderTelegram(event.type, event.payload));
    // The chat can't receive messages: record it so the UI asks the user to reconnect.
    if (outcome.kind === "permanent" && (outcome.code === "TELEGRAM_BLOCKED" || outcome.code === "TELEGRAM_CHAT_NOT_FOUND")) {
      await prisma.notificationSettings.updateMany({
        where: { userId, telegramChatId: settings.telegramChatId },
        data: { telegramStatus: outcome.code === "TELEGRAM_BLOCKED" ? "BLOCKED" : "INVALID" },
      });
    }
    return outcome;
  }

  if (!settings.emailAddress || !settings.emailVerifiedAt) return { kind: "skip", code: "CHANNEL_DISABLED" };
  if (event.type === "INCIDENT_OPENED" && !settings.emailOnIncident) return { kind: "skip", code: "CHANNEL_DISABLED" };
  if (event.type === "INCIDENT_RESOLVED" && !settings.emailOnRecovery) return { kind: "skip", code: "CHANNEL_DISABLED" };
  const rendered = renderEmail(event.type, event.payload);
  return sendBrevoEmail({ to: settings.emailAddress, ...rendered });
}

/** Apply a provider outcome to a PROCESSING delivery. Guarded so a stale worker can't overwrite a newer state. */
async function settle(row: ClaimedRow, outcome: SendOutcome, now: Date): Promise<"sent" | "retry" | "failed" | "skipped"> {
  const guard = { id: row.id, status: "PROCESSING" as const };
  const clear = { lockedUntil: null, updatedAt: now };

  if (outcome.kind === "sent") {
    await prisma.notificationDelivery.updateMany({
      where: guard,
      data: { ...clear, status: "SENT", sentAt: now, lastError: null, providerMessageId: outcome.providerMessageId ? normalizeMessageId(outcome.providerMessageId) : null, providerStatus: "accepted" },
    });
    return "sent";
  }
  if (outcome.kind === "skip") {
    await prisma.notificationDelivery.updateMany({ where: guard, data: { ...clear, status: "SKIPPED", lastError: outcome.code } });
    return "skipped";
  }
  if (outcome.kind === "permanent") {
    await prisma.notificationDelivery.updateMany({ where: guard, data: { ...clear, status: "FAILED", lastError: outcome.code } });
    return "failed";
  }
  // transient
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.notificationDelivery.updateMany({ where: guard, data: { ...clear, status: "FAILED", lastError: "RETRIES_EXHAUSTED" } });
    return "failed";
  }
  const delay = Math.max(backoffMs(row.attempts), outcome.retryAfterMs ?? 0);
  await prisma.notificationDelivery.updateMany({
    where: guard,
    data: { ...clear, status: "PENDING", lastError: outcome.code, nextAttemptAt: new Date(now.getTime() + delay) },
  });
  return "retry";
}

async function processOne(row: ClaimedRow, now: Date): Promise<"sent" | "retry" | "failed" | "skipped"> {
  const event = await prisma.notificationEvent.findUnique({ where: { id: row.eventId } });
  if (!event) return settle(row, { kind: "skip", code: "CHANNEL_DISABLED" }, now);

  if (now.getTime() - event.createdAt.getTime() > MAX_EVENT_AGE_MS) {
    return settle(row, { kind: "permanent", code: "EXPIRED" }, now);
  }

  if (event.type === "INCIDENT_RESOLVED" && event.incidentId) {
    // Per channel, a recovery notice follows its alert: wait while the alert is still in flight,
    // and skip the recovery if the alert never reached the user.
    const payload = event.payload as unknown as IncidentPayload;
    const cycle = Number(/:c(\d+):resolved$/.exec(event.idempotencyKey)?.[1] ?? 1);
    const alert = await prisma.notificationDelivery.findFirst({
      where: { channel: row.channel, event: { idempotencyKey: openedKey(payload.incidentId, cycle) } },
      select: { status: true },
    });
    if (alert && (alert.status === "PENDING" || alert.status === "PROCESSING")) {
      await prisma.notificationDelivery.updateMany({
        where: { id: row.id, status: "PROCESSING" },
        data: { status: "PENDING", lockedUntil: null, attempts: Math.max(0, row.attempts - 1), nextAttemptAt: new Date(now.getTime() + 30_000), updatedAt: now },
      });
      return "retry";
    }
    if (alert && (alert.status === "FAILED" || alert.status === "SKIPPED")) {
      return settle(row, { kind: "skip", code: "RECOVERY_WITHOUT_ALERT" }, now);
    }
  }

  const outcome = await sendThroughChannel(row.channel, row.userId, { type: event.type, payload: event.payload as unknown as EventPayload });
  return settle(row, outcome, now);
}

export interface ProcessSummary {
  claimed: number;
  sent: number;
  retry: number;
  failed: number;
  skipped: number;
}

/**
 * Deliver due notifications. Safe to call from any number of concurrent invocations (cron,
 * manual checks, the dedicated endpoint): claiming is atomic, and one channel failing never
 * affects another because every delivery is settled independently.
 */
/** `onlyUserIds` restricts a run to those users' deliveries (used by tests that share a database). */
export async function processNotificationOutbox(options: { limit?: number; now?: Date; onlyUserIds?: string[] } = {}): Promise<ProcessSummary> {
  const now = options.now ?? new Date();
  const rows = await claimDue(now, options.limit ?? CLAIM_BATCH, options.onlyUserIds);
  const summary: ProcessSummary = { claimed: rows.length, sent: 0, retry: 0, failed: 0, skipped: 0 };

  let index = 0;
  const worker = async () => {
    while (index < rows.length) {
      const row = rows[index++];
      let result: "sent" | "retry" | "failed" | "skipped";
      try {
        result = await processOne(row, new Date());
      } catch (err) {
        console.error("Notification delivery crashed", row.id, err instanceof Error ? err.name : "error");
        // Unexpected error (e.g. database hiccup): treat as transient so it is retried, within the attempt bound.
        result = await settle(row, { kind: "transient", code: "PROVIDER_UNAVAILABLE" }, new Date()).catch(() => "retry" as const);
      }
      summary[result]++;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
  return summary;
}
