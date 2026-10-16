import { after, afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { brevoOk, cleanup, installFetchMock, makeUser, telegramOk } from "./helpers";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/notifications/tokens";
import {
  LINK_TOKEN_TTL_MS,
  NotificationError,
  confirmEmailToken,
  consumeTelegramLinkToken,
  createTelegramLink,
  disconnectTelegram,
  getNotificationOverview,
  sendTestNotification,
  startEmailVerification,
} from "@/lib/notifications/settings";
import { resetTelegramCacheForTests } from "@/lib/notifications/telegram";
import { handleTelegramUpdate } from "@/lib/notifications/webhooks";

after(cleanup);

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
  resetTelegramCacheForTests();
});
const mock = (handlers: Parameters<typeof installFetchMock>[0]) => {
  const m = installFetchMock(handlers);
  restore = m.restore;
  return m.calls;
};
const getMe = () => ({ status: 200, body: { ok: true, result: { username: "RuntimeHQTestBot" } } });
const tokenFromUrl = (url: string) => new URL(url).searchParams.get("start")!;
const rejects = (promise: Promise<unknown>, code: string) =>
  assert.rejects(promise, (err) => err instanceof NotificationError && err.code === code);

async function linkedUser() {
  const u = await makeUser({ telegram: false });
  mock({ telegram: getMe });
  const link = await createTelegramLink(u.userId);
  return { u, token: tokenFromUrl(link.url), link };
}

describe("Telegram account linking", () => {
  it("creates a single-use deep link and stores only the token hash", async () => {
    const { u, token, link } = await linkedUser();
    assert.match(link.url, /^https:\/\/t\.me\/RuntimeHQTestBot\?start=[A-Za-z0-9_-]{43}$/);
    const stored = await prisma.notificationToken.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    assert.equal(stored.userId, u.userId);
    assert.notEqual(stored.tokenHash, token);
    const ttl = stored.expiresAt.getTime() - Date.now();
    assert.ok(ttl > 0 && ttl <= LINK_TOKEN_TTL_MS);
  });

  it("links the chat to the account that owns the token, and only once", async () => {
    const { u, token } = await linkedUser();
    const first = await consumeTelegramLinkToken(token, { id: 4242, type: "private", displayName: "@tester" });
    assert.deepEqual(first, { ok: true, userId: u.userId });
    const settings = await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } });
    assert.equal(settings.telegramChatId, "4242");
    assert.equal(settings.telegramStatus, "ACTIVE");
    const second = await consumeTelegramLinkToken(token, { id: 9999, type: "private" });
    assert.deepEqual(second, { ok: false, reason: "INVALID_OR_EXPIRED" });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramChatId, "4242");
  });

  it("rejects invalid, forged and expired tokens", async () => {
    const { u, token } = await linkedUser();
    assert.deepEqual(await consumeTelegramLinkToken("not-a-token", { id: 1, type: "private" }), { ok: false, reason: "INVALID_OR_EXPIRED" });
    assert.deepEqual(await consumeTelegramLinkToken("A".repeat(43), { id: 1, type: "private" }), { ok: false, reason: "INVALID_OR_EXPIRED" });
    await prisma.notificationToken.updateMany({ where: { userId: u.userId, kind: "TELEGRAM_LINK" }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.deepEqual(await consumeTelegramLinkToken(token, { id: 1, type: "private" }), { ok: false, reason: "INVALID_OR_EXPIRED" });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramChatId, null);
  });

  it("refuses group chats without consuming the token", async () => {
    const { u, token } = await linkedUser();
    assert.deepEqual(await consumeTelegramLinkToken(token, { id: -100, type: "supergroup" }), { ok: false, reason: "PRIVATE_CHAT_ONLY" });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramChatId, null);
    assert.equal((await consumeTelegramLinkToken(token, { id: 12, type: "private" })).ok, true);
  });

  it("a chat linked to one account cannot be attached to another", async () => {
    const a = await linkedUser();
    assert.equal((await consumeTelegramLinkToken(a.token, { id: 31337, type: "private" })).ok, true);
    const b = await linkedUser();
    assert.deepEqual(await consumeTelegramLinkToken(b.token, { id: 31337, type: "private" }), { ok: false, reason: "CHAT_IN_USE" });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: b.u.userId } })).telegramChatId, null);
  });

  it("rate-limits link creation", async () => {
    const u = await makeUser({ telegram: false });
    mock({ telegram: getMe });
    for (let i = 0; i < 5; i++) await createTelegramLink(u.userId);
    await rejects(createTelegramLink(u.userId), "RATE_LIMITED");
  });

  it("handles /start from the webhook and replies; /stop unlinks", async () => {
    const { u, token } = await linkedUser();
    const calls = mock({ telegram: telegramOk });
    await handleTelegramUpdate({ update_id: 1, message: { text: `/start ${token}`, from: { id: 555, first_name: "Ada", username: "ada" }, chat: { id: 555, type: "private" } } });
    const settings = await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } });
    assert.equal(settings.telegramChatId, "555");
    assert.equal(settings.telegramDisplayName, "@ada");
    assert.match(String(calls.at(-1)?.body.text), /Telegram connected/);

    await handleTelegramUpdate({ update_id: 2, message: { text: "/start " + token, chat: { id: 555, type: "private" } } });
    assert.match(String(calls.at(-1)?.body.text), /invalid or has expired/);

    await handleTelegramUpdate({ update_id: 3, message: { text: "/stop", chat: { id: 555, type: "private" } } });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramChatId, null);
  });

  it("marks the chat blocked when the user blocks the bot", async () => {
    const u = await makeUser();
    await prisma.notificationSettings.update({ where: { userId: u.userId }, data: { telegramChatId: "8801" } });
    await handleTelegramUpdate({ update_id: 5, my_chat_member: { chat: { id: 8801, type: "private" }, new_chat_member: { status: "kicked" } } });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramStatus, "BLOCKED");
    await handleTelegramUpdate({ update_id: 6, my_chat_member: { chat: { id: 8801, type: "private" }, new_chat_member: { status: "member" } } });
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramStatus, "ACTIVE");
  });

  it("disconnecting removes the chat and cancels pending links", async () => {
    const { u, token } = await linkedUser();
    await disconnectTelegram(u.userId);
    assert.deepEqual(await consumeTelegramLinkToken(token, { id: 1, type: "private" }), { ok: false, reason: "INVALID_OR_EXPIRED" });
  });
});

describe("email verification", () => {
  it("emails a single-use link and only enables the address after the owner confirms it", async () => {
    const u = await makeUser({ email: false });
    const calls = mock({ brevo: brevoOk });
    await startEmailVerification(u.userId, "  Person@Example.com ");
    const sent = calls.at(-1)!;
    assert.deepEqual((sent.body.to as Array<{ email: string }>)[0], { email: "person@example.com" });
    const token = /confirm_email=([A-Za-z0-9_-]+)/.exec(String(sent.body.htmlContent))![1];
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).emailVerifiedAt, null);

    const other = await makeUser({ email: false });
    await rejects(confirmEmailToken(other.userId, token), "INVALID_TOKEN"); // bound to the requesting account

    assert.deepEqual(await confirmEmailToken(u.userId, token), { address: "person@example.com" });
    const settings = await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } });
    assert.equal(settings.emailAddress, "person@example.com");
    assert.ok(settings.emailVerifiedAt);
    await rejects(confirmEmailToken(u.userId, token), "INVALID_TOKEN"); // single use
  });

  it("rejects expired tokens, malformed tokens and invalid addresses", async () => {
    const u = await makeUser({ email: false });
    const calls = mock({ brevo: brevoOk });
    await rejects(startEmailVerification(u.userId, "not-an-email"), "INVALID_EMAIL");
    await startEmailVerification(u.userId, "ok@example.com");
    const token = /confirm_email=([A-Za-z0-9_-]+)/.exec(String(calls.at(-1)!.body.htmlContent))![1];
    await prisma.notificationToken.updateMany({ where: { userId: u.userId, kind: "EMAIL_VERIFY" }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await rejects(confirmEmailToken(u.userId, token), "INVALID_TOKEN");
    await rejects(confirmEmailToken(u.userId, "short"), "INVALID_TOKEN");
    await rejects(confirmEmailToken(u.userId, undefined), "INVALID_TOKEN");
  });

  it("surfaces provider failure and leaves no usable token behind", async () => {
    const u = await makeUser({ email: false });
    mock({ brevo: () => ({ status: 400, body: { code: "invalid_parameter", message: "Sender is invalid" } }) });
    await rejects(startEmailVerification(u.userId, "ok@example.com"), "EMAIL_SENDER_INVALID");
    assert.equal(await prisma.notificationToken.count({ where: { userId: u.userId, kind: "EMAIL_VERIFY" } }), 0);
  });

  it("reports incomplete server configuration clearly", async () => {
    const u = await makeUser({ email: false });
    const saved = process.env.BREVO_API_KEY;
    delete process.env.BREVO_API_KEY;
    try {
      await rejects(startEmailVerification(u.userId, "ok@example.com"), "NOT_CONFIGURED");
      await rejects(sendTestNotification(u.userId, "EMAIL"), "NOT_CONFIGURED");
    } finally {
      process.env.BREVO_API_KEY = saved;
    }
  });
});

describe("test notifications", () => {
  it("requires a connected channel", async () => {
    const u = await makeUser({ email: false, telegram: false });
    mock({});
    await rejects(sendTestNotification(u.userId, "TELEGRAM"), "NOT_CONNECTED");
    await rejects(sendTestNotification(u.userId, "EMAIL"), "NOT_CONNECTED");
  });

  it("sends once, records it in the history, and rate-limits the next attempt", async () => {
    const u = await makeUser();
    const calls = mock({ telegram: telegramOk, brevo: brevoOk });
    await sendTestNotification(u.userId, "TELEGRAM");
    assert.equal(calls.filter((c) => c.provider === "telegram").length, 1);
    await assert.rejects(sendTestNotification(u.userId, "TELEGRAM"), (err) => err instanceof NotificationError && err.code === "RATE_LIMITED" && err.status === 429 && !!err.retryAfterSeconds);
    assert.equal(calls.filter((c) => c.provider === "telegram").length, 1);
    await sendTestNotification(u.userId, "EMAIL"); // limits are per channel
    const overview = await getNotificationOverview(u.userId);
    assert.deepEqual(overview.history.map((h) => [h.channel, h.type, h.status]).sort(), [["EMAIL", "TEST", "SENT"], ["TELEGRAM", "TEST", "SENT"]]);
  });

  it("explains a blocked bot and marks the chat for reconnection", async () => {
    const u = await makeUser();
    mock({ telegram: () => ({ status: 403, body: { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" } }) });
    await rejects(sendTestNotification(u.userId, "TELEGRAM"), "TELEGRAM_BLOCKED");
    const overview = await getNotificationOverview(u.userId);
    assert.equal(overview.telegram.status, "BLOCKED");
    assert.match(overview.history[0].error ?? "", /Reconnect Telegram/);
  });
});

describe("authorization and data exposure", () => {
  it("never exposes chat ids, tokens, or another user's data", async () => {
    const a = await makeUser();
    const b = await makeUser({ email: false, telegram: false });
    const chatId = (await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: a.userId } })).telegramChatId!;
    const overviewA = JSON.stringify(await getNotificationOverview(a.userId));
    assert.ok(!overviewA.includes(chatId));
    const overviewB = await getNotificationOverview(b.userId);
    assert.equal(overviewB.telegram.connected, false);
    assert.equal(overviewB.email.address, null);
    assert.equal(overviewB.history.length, 0);
    assert.ok(!JSON.stringify(overviewB).includes(a.email));
  });

  it("every settings, link and test endpoint rejects unauthenticated requests", async () => {
    const routes: Array<[string, string, string]> = [
      ["@/app/api/notifications/route", "GET", "/api/notifications"],
      ["@/app/api/notifications/route", "PATCH", "/api/notifications"],
      ["@/app/api/notifications/email/route", "POST", "/api/notifications/email"],
      ["@/app/api/notifications/email/route", "DELETE", "/api/notifications/email"],
      ["@/app/api/notifications/email/confirm/route", "POST", "/api/notifications/email/confirm"],
      ["@/app/api/notifications/email/test/route", "POST", "/api/notifications/email/test"],
      ["@/app/api/notifications/telegram/link/route", "POST", "/api/notifications/telegram/link"],
      ["@/app/api/notifications/telegram/route", "DELETE", "/api/notifications/telegram"],
      ["@/app/api/notifications/telegram/test/route", "POST", "/api/notifications/telegram/test"],
    ];
    for (const [modulePath, method, path] of routes) {
      const mod = (await import(modulePath)) as Record<string, (req: NextRequest) => Promise<Response>>;
      const res = await mod[method](new NextRequest(`http://localhost${path}`, { method }));
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });
});

describe("webhook authentication", () => {
  const update = { update_id: 1, message: { text: "/start whatever", chat: { id: 1, type: "private" } } };

  it("rejects Telegram webhook calls without the secret and accepts them with it", async () => {
    const { POST } = await import("@/app/api/telegram/webhook/route");
    const post = (headers: Record<string, string>) => POST(new NextRequest("http://localhost/api/telegram/webhook", { method: "POST", headers, body: JSON.stringify(update) }));
    mock({ telegram: telegramOk });
    assert.equal((await post({})).status, 403);
    assert.equal((await post({ "x-telegram-bot-api-secret-token": "wrong" })).status, 403);
    assert.equal((await post({ "x-telegram-bot-api-secret-token": "test-webhook-secret" })).status, 200);
  });

  it("disables the Telegram webhook when no secret is configured", async () => {
    const { POST } = await import("@/app/api/telegram/webhook/route");
    const saved = process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    try {
      const res = await POST(new NextRequest("http://localhost/api/telegram/webhook", { method: "POST", headers: { "x-telegram-bot-api-secret-token": "" }, body: "{}" }));
      assert.equal(res.status, 503);
    } finally {
      process.env.TELEGRAM_WEBHOOK_SECRET = saved;
    }
  });

  it("applies Brevo delivery events only with the secret", async () => {
    const { POST } = await import("@/app/api/brevo/webhook/route");
    process.env.BREVO_WEBHOOK_SECRET = "brevo-secret";
    const u = await makeUser();
    const event = await prisma.notificationEvent.create({ data: { id: `ev-${u.userId}`, userId: u.userId, type: "TEST", idempotencyKey: `t-${u.userId}`, payload: { kind: "test" } } });
    await prisma.notificationDelivery.create({ data: { eventId: event.id, userId: u.userId, channel: "EMAIL", status: "SENT", providerMessageId: "abc123@smtp-relay.test" } });
    const send = (path: string, headers: Record<string, string>, body: unknown) => POST(new NextRequest(`http://localhost/api/brevo/webhook${path}`, { method: "POST", headers, body: JSON.stringify(body) }));
    const delivered = { event: "delivered", "message-id": "<ABC123@smtp-relay.test>", email: "x@example.com" };

    assert.equal((await send("", {}, delivered)).status, 403);
    assert.equal((await prisma.notificationDelivery.findFirstOrThrow({ where: { eventId: event.id } })).status, "SENT");
    assert.equal((await send("?secret=brevo-secret", {}, delivered)).status, 200);
    assert.equal((await prisma.notificationDelivery.findFirstOrThrow({ where: { eventId: event.id } })).status, "DELIVERED");
    assert.equal((await send("", { authorization: "Bearer brevo-secret" }, { ...delivered, event: "hard_bounce" })).status, 200);
    assert.equal((await prisma.notificationDelivery.findFirstOrThrow({ where: { eventId: event.id } })).status, "FAILED");
    delete process.env.BREVO_WEBHOOK_SECRET;
  });
});
