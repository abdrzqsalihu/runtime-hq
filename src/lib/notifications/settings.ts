import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendBrevoEmail } from "./brevo";
import { appUrl, brevoConfig, failureThreshold, isEmailConfigured, isTelegramConfigured } from "./config";
import { sendThroughChannel } from "./outbox";
import { getBotUsername } from "./telegram";
import { renderVerificationEmail } from "./templates";
import { generateToken, hashToken } from "./tokens";
import { ERROR_MESSAGES, type Channel, type SendOutcome } from "./types";

export const LINK_TOKEN_TTL_MS = 15 * 60_000;
export const EMAIL_TOKEN_TTL_MS = 60 * 60_000;
const TEST_COOLDOWN_MS = 60_000;
const TOKEN_WINDOW_MS = 10 * 60_000;
const MAX_TOKENS_PER_WINDOW = 5;

export class NotificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export async function ensureSettings(userId: string) {
  return prisma.notificationSettings.upsert({ where: { userId }, update: {}, create: { userId } });
}

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/** What the UI is allowed to see: never the chat id, tokens or provider details. */
export async function getNotificationOverview(userId: string) {
  const settings = await ensureSettings(userId);
  const now = new Date();

  const [pendingEmail, deliveries] = await Promise.all([
    prisma.notificationToken.findFirst({
      where: { userId, kind: "EMAIL_VERIFY", usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { payload: true, expiresAt: true },
    }),
    prisma.notificationDelivery.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, channel: true, status: true, attempts: true, lastError: true, createdAt: true, sentAt: true, deliveredAt: true, providerStatus: true, event: { select: { type: true, payload: true } } },
    }),
  ]);

  return {
    providers: { email: isEmailConfigured(), telegram: isTelegramConfigured() },
    failureThreshold: failureThreshold(),
    email: {
      address: settings.emailAddress,
      verified: !!settings.emailVerifiedAt && !!settings.emailAddress,
      pendingAddress: pendingEmail?.payload ?? null,
      pendingExpiresAt: pendingEmail?.expiresAt ?? null,
      onIncident: settings.emailOnIncident,
      onRecovery: settings.emailOnRecovery,
    },
    telegram: {
      connected: !!settings.telegramChatId,
      status: settings.telegramChatId ? settings.telegramStatus : null,
      displayName: settings.telegramDisplayName,
      linkedAt: settings.telegramLinkedAt,
      onIncident: settings.telegramOnIncident,
      onRecovery: settings.telegramOnRecovery,
    },
    history: deliveries.map((d) => {
      const payload = d.event.payload as { kind?: string; services?: Array<{ name: string }>; title?: string } | null;
      return {
        id: d.id,
        channel: d.channel,
        type: d.event.type,
        subject: payload?.kind === "incident" ? (payload.services?.map((s) => s.name).join(", ") || payload.title || null) : null,
        status: d.status,
        attempts: d.attempts,
        error: d.lastError ? (ERROR_MESSAGES[d.lastError] ?? "Delivery failed.") : null,
        errorCode: d.lastError,
        createdAt: d.createdAt,
        sentAt: d.sentAt,
        deliveredAt: d.deliveredAt,
        providerStatus: d.providerStatus,
      };
    }),
  };
}

const preferencesSchema = z
  .object({
    emailOnIncident: z.boolean(),
    emailOnRecovery: z.boolean(),
    telegramOnIncident: z.boolean(),
    telegramOnRecovery: z.boolean(),
  })
  .partial()
  .strict();

export async function updatePreferences(userId: string, input: unknown) {
  const data = preferencesSchema.parse(input);
  await ensureSettings(userId);
  return prisma.notificationSettings.update({ where: { userId }, data });
}

async function enforceTokenRateLimit(userId: string, kind: "TELEGRAM_LINK" | "EMAIL_VERIFY", max = MAX_TOKENS_PER_WINDOW) {
  const recent = await prisma.notificationToken.count({
    where: { userId, kind, createdAt: { gt: new Date(Date.now() - TOKEN_WINDOW_MS) } },
  });
  if (recent >= max) {
    throw new NotificationError("RATE_LIMITED", "Too many attempts. Wait a few minutes and try again.", 429, Math.ceil(TOKEN_WINDOW_MS / 1000));
  }
}

// ───────────────────────── Telegram linking ─────────────────────────

/** Create a single-use, 15-minute linking token bound to this user and return the bot deep link. */
export async function createTelegramLink(userId: string) {
  if (!isTelegramConfigured()) throw new NotificationError("NOT_CONFIGURED", "Telegram is not configured on this server.", 503);
  await enforceTokenRateLimit(userId, "TELEGRAM_LINK");

  const username = await getBotUsername();
  if (!username) throw new NotificationError("PROVIDER_UNAVAILABLE", "Could not reach Telegram to prepare the link. Try again shortly.", 502);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);
  await prisma.notificationToken.create({ data: { userId, kind: "TELEGRAM_LINK", tokenHash: hashToken(token), expiresAt } });
  return { url: `https://t.me/${username}?start=${token}`, botUsername: username, expiresAt };
}

export type LinkResult = { ok: true; userId: string } | { ok: false; reason: "INVALID_OR_EXPIRED" | "CHAT_IN_USE" | "PRIVATE_CHAT_ONLY" };

/**
 * Called from the verified Telegram webhook when a user presses Start with a link token.
 * The token (not anything the browser sent) decides which account the chat is attached to,
 * and a token can be consumed exactly once.
 */
export async function consumeTelegramLinkToken(token: string, chat: { id: number | string; type: string; displayName?: string }): Promise<LinkResult> {
  if (chat.type !== "private") return { ok: false, reason: "PRIVATE_CHAT_ONLY" };
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return { ok: false, reason: "INVALID_OR_EXPIRED" };

  const tokenHash = hashToken(token);
  const now = new Date();
  const claimed = await prisma.notificationToken.updateMany({
    where: { tokenHash, kind: "TELEGRAM_LINK", usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) return { ok: false, reason: "INVALID_OR_EXPIRED" };

  const row = await prisma.notificationToken.findUnique({ where: { tokenHash }, select: { userId: true } });
  if (!row) return { ok: false, reason: "INVALID_OR_EXPIRED" };

  const chatId = String(chat.id);
  const owner = await prisma.notificationSettings.findUnique({ where: { telegramChatId: chatId }, select: { userId: true } });
  if (owner && owner.userId !== row.userId) return { ok: false, reason: "CHAT_IN_USE" };

  await prisma.notificationSettings.upsert({
    where: { userId: row.userId },
    update: { telegramChatId: chatId, telegramDisplayName: chat.displayName ?? null, telegramLinkedAt: now, telegramStatus: "ACTIVE" },
    create: { userId: row.userId, telegramChatId: chatId, telegramDisplayName: chat.displayName ?? null, telegramLinkedAt: now },
  });
  return { ok: true, userId: row.userId };
}

export async function disconnectTelegram(userId: string) {
  await prisma.notificationSettings.updateMany({
    where: { userId },
    data: { telegramChatId: null, telegramDisplayName: null, telegramLinkedAt: null, telegramStatus: "ACTIVE" },
  });
  await prisma.notificationToken.updateMany({ where: { userId, kind: "TELEGRAM_LINK", usedAt: null }, data: { usedAt: new Date() } });
}

/** `/stop` sent to the bot: unlink whichever account owns that chat. */
export async function unlinkTelegramChat(chatId: string) {
  await prisma.notificationSettings.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramChatId: null, telegramDisplayName: null, telegramLinkedAt: null, telegramStatus: "ACTIVE" },
  });
}

/** The user blocked (or unblocked) the bot. */
export async function setTelegramChatReachable(chatId: string, reachable: boolean) {
  await prisma.notificationSettings.updateMany({
    where: { telegramChatId: chatId },
    data: { telegramStatus: reachable ? "ACTIVE" : "BLOCKED" },
  });
}

export async function maskedEmailForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const [name = "", domain = ""] = (user?.email ?? "").split("@");
  return name ? `${name[0]}***@${domain}` : "your account";
}

// ───────────────────────── Email verification ─────────────────────────

/** Send a confirmation link to a new notification address. Nothing is stored on the account until it is confirmed. */
export async function startEmailVerification(userId: string, rawAddress: unknown) {
  if (!isEmailConfigured()) throw new NotificationError("NOT_CONFIGURED", "Email is not configured on this server.", 503);

  const parsed = emailSchema.safeParse(rawAddress);
  if (!parsed.success) throw new NotificationError("INVALID_EMAIL", "Enter a valid email address.", 400);
  const address = parsed.data;

  await enforceTokenRateLimit(userId, "EMAIL_VERIFY", 3);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
  const record = await prisma.notificationToken.create({
    data: { userId, kind: "EMAIL_VERIFY", tokenHash: hashToken(token), payload: address, expiresAt },
  });

  const outcome = await sendBrevoEmail({ to: address, ...renderVerificationEmail(`${appUrl()}/settings?confirm_email=${token}`) });
  if (outcome.kind !== "sent") {
    await prisma.notificationToken.delete({ where: { id: record.id } }).catch(() => {});
    throw outcomeToError(outcome);
  }
  return { address, expiresAt };
}

/** The signed-in user confirms a token that was emailed to the new address. */
export async function confirmEmailToken(userId: string, token: unknown) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
    throw new NotificationError("INVALID_TOKEN", "This confirmation link is invalid or has expired.", 400);
  }
  const tokenHash = hashToken(token);
  const now = new Date();
  // userId in the filter binds the token to the signed-in account.
  const claimed = await prisma.notificationToken.updateMany({
    where: { tokenHash, userId, kind: "EMAIL_VERIFY", usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) throw new NotificationError("INVALID_TOKEN", "This confirmation link is invalid or has expired.", 400);

  const row = await prisma.notificationToken.findUnique({ where: { tokenHash }, select: { payload: true } });
  if (!row?.payload) throw new NotificationError("INVALID_TOKEN", "This confirmation link is invalid or has expired.", 400);

  await ensureSettings(userId);
  await prisma.notificationSettings.update({ where: { userId }, data: { emailAddress: row.payload, emailVerifiedAt: now } });
  return { address: row.payload };
}

export async function removeEmail(userId: string) {
  await prisma.notificationSettings.updateMany({ where: { userId }, data: { emailAddress: null, emailVerifiedAt: null } });
  await prisma.notificationToken.updateMany({ where: { userId, kind: "EMAIL_VERIFY", usedAt: null }, data: { usedAt: new Date() } });
}

// ───────────────────────── Test notifications ─────────────────────────

function outcomeToError(outcome: Exclude<SendOutcome, { kind: "sent" }>): NotificationError {
  const message = ERROR_MESSAGES[outcome.code] ?? "Delivery failed.";
  const status = outcome.kind === "transient" ? 502 : outcome.code === "NOT_CONFIGURED" ? 503 : 422;
  return new NotificationError(outcome.code, message, status);
}

/**
 * Send a test message straight away (no queue, no retries) so the user gets immediate, honest
 * feedback. It is recorded like any other delivery, so it shows up in the history.
 */
export async function sendTestNotification(userId: string, channel: Channel) {
  if (channel === "TELEGRAM" && !isTelegramConfigured()) throw new NotificationError("NOT_CONFIGURED", "Telegram is not configured on this server.", 503);
  if (channel === "EMAIL" && !brevoConfig()) throw new NotificationError("NOT_CONFIGURED", "Email is not configured on this server.", 503);

  const settings = await ensureSettings(userId);
  if (channel === "TELEGRAM" && !settings.telegramChatId) throw new NotificationError("NOT_CONNECTED", "Connect Telegram first.", 409);
  if (channel === "EMAIL" && !(settings.emailAddress && settings.emailVerifiedAt)) throw new NotificationError("NOT_CONNECTED", "Confirm an email address first.", 409);

  const since = new Date(Date.now() - TEST_COOLDOWN_MS);
  const recent = await prisma.notificationDelivery.findFirst({
    where: { userId, channel, event: { type: "TEST" }, createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent) {
    const wait = Math.max(1, Math.ceil((recent.createdAt.getTime() + TEST_COOLDOWN_MS - Date.now()) / 1000));
    throw new NotificationError("RATE_LIMITED", `Wait ${wait}s before sending another test.`, 429, wait);
  }

  const eventId = randomUUID();
  const now = new Date();
  await prisma.notificationEvent.create({
    data: {
      id: eventId,
      userId,
      type: "TEST",
      idempotencyKey: `test:${userId}:${channel}:${eventId}`,
      payload: { kind: "test" },
      deliveries: { create: { userId, channel, status: "PROCESSING", attempts: 1, lockedUntil: new Date(now.getTime() + 60_000) } },
    },
  });
  const delivery = await prisma.notificationDelivery.findFirstOrThrow({ where: { eventId, channel } });

  const outcome = await sendThroughChannel(channel, userId, { type: "TEST", payload: { kind: "test" } });
  const base = { lockedUntil: null, updatedAt: new Date() };

  if (outcome.kind === "sent") {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: { ...base, status: "SENT", sentAt: new Date(), providerMessageId: outcome.providerMessageId?.replace(/^<|>$/g, "").toLowerCase() ?? null, providerStatus: "accepted" },
    });
    return { ok: true as const };
  }
  await prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: { ...base, status: outcome.kind === "skip" ? "SKIPPED" : "FAILED", lastError: outcome.code },
  });
  throw outcomeToError(outcome);
}

