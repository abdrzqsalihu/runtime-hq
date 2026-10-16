import { after, afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { brevoOk, cleanup, events, installFetchMock, makeDueNow, makeUser, recordCheck, telegramOk } from "./helpers";
import { prisma } from "@/lib/db";
import { setIncidentStatus } from "@/lib/incident-manager";
import { MAX_ATTEMPTS, MAX_EVENT_AGE_MS, backoffMs, processNotificationOutbox } from "@/lib/notifications/outbox";
import { classifyBrevoFailure } from "@/lib/notifications/brevo";
import { classifyTelegramFailure } from "@/lib/notifications/telegram";
import { renderEmail, renderTelegram } from "@/lib/notifications/templates";

after(cleanup);

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

const mock = (handlers: Parameters<typeof installFetchMock>[0]) => {
  const m = installFetchMock(handlers);
  restore = m.restore;
  return m.calls;
};

async function openIncident() {
  const u = await makeUser();
  await recordCheck(u, "OUTAGE");
  await recordCheck(u, "OUTAGE");
  return u;
}

const deliveryFor = async (userId: string, channel: "EMAIL" | "TELEGRAM", type = "INCIDENT_OPENED") =>
  prisma.notificationDelivery.findFirstOrThrow({ where: { userId, channel, event: { type: type as never } } });

describe("outbox delivery", () => {
  it("sends an alert to every enabled channel and records provider acceptance", async () => {
    const calls = mock({ telegram: telegramOk, brevo: brevoOk });
    const u = await openIncident();
    const summary = await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal(summary.sent, 2);
    assert.equal(calls.filter((c) => c.provider === "telegram").length, 1);
    assert.equal(calls.filter((c) => c.provider === "brevo").length, 1);
    const email = await deliveryFor(u.userId, "EMAIL");
    assert.equal(email.status, "SENT");
    assert.ok(email.providerMessageId && email.sentAt);
  });

  it("a Telegram failure does not block email delivery (and blocks the chat)", async () => {
    mock({ telegram: () => ({ status: 403, body: { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" } }), brevo: brevoOk });
    const u = await openIncident();
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal((await deliveryFor(u.userId, "EMAIL")).status, "SENT");
    const tg = await deliveryFor(u.userId, "TELEGRAM");
    assert.equal(tg.status, "FAILED");
    assert.equal(tg.lastError, "TELEGRAM_BLOCKED");
    assert.equal((await prisma.notificationSettings.findUniqueOrThrow({ where: { userId: u.userId } })).telegramStatus, "BLOCKED");
  });

  it("a Brevo failure does not block Telegram delivery and is retried later", async () => {
    mock({ telegram: telegramOk, brevo: () => ({ status: 503, body: { code: "service_unavailable", message: "try later" } }) });
    const u = await openIncident();
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal((await deliveryFor(u.userId, "TELEGRAM")).status, "SENT");
    const email = await deliveryFor(u.userId, "EMAIL");
    assert.equal(email.status, "PENDING");
    assert.equal(email.attempts, 1);
    assert.ok(email.nextAttemptAt.getTime() > Date.now());
    assert.equal(email.lastError, "PROVIDER_UNAVAILABLE");
  });

  it("transient errors are retried a bounded number of times, then given up", async () => {
    const calls = mock({ telegram: telegramOk, brevo: () => ({ status: 503, body: {} }) });
    const u = await openIncident();
    for (let i = 0; i < MAX_ATTEMPTS + 3; i++) {
      await makeDueNow(u.userId);
      await processNotificationOutbox({ onlyUserIds: [u.userId] });
    }
    const email = await deliveryFor(u.userId, "EMAIL");
    assert.equal(email.status, "FAILED");
    assert.equal(email.lastError, "RETRIES_EXHAUSTED");
    assert.equal(email.attempts, MAX_ATTEMPTS);
    assert.equal(calls.filter((c) => c.provider === "brevo").length, MAX_ATTEMPTS);
  });

  it("permanent errors fail immediately without retrying", async () => {
    const calls = mock({ telegram: telegramOk, brevo: () => ({ status: 400, body: { code: "invalid_parameter", message: "Sender is invalid / not validated" } }) });
    const u = await openIncident();
    for (let i = 0; i < 3; i++) {
      await makeDueNow(u.userId);
      await processNotificationOutbox({ onlyUserIds: [u.userId] });
    }
    const email = await deliveryFor(u.userId, "EMAIL");
    assert.equal(email.status, "FAILED");
    assert.equal(email.lastError, "EMAIL_SENDER_INVALID");
    assert.equal(calls.filter((c) => c.provider === "brevo").length, 1);
  });

  it("honours a provider retry-after hint", async () => {
    mock({ telegram: () => ({ status: 429, body: { ok: false, error_code: 429, description: "Too Many Requests", parameters: { retry_after: 600 } } }), brevo: brevoOk });
    const u = await openIncident();
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    const tg = await deliveryFor(u.userId, "TELEGRAM");
    assert.equal(tg.status, "PENDING");
    assert.ok(tg.nextAttemptAt.getTime() >= Date.now() + 590_000);
  });

  it("concurrent processors never send the same notification twice", async () => {
    const calls = mock({
      telegram: async () => {
        await new Promise((r) => setTimeout(r, 150));
        return { status: 200, body: { ok: true, result: { message_id: 1 } } };
      },
      brevo: async () => {
        await new Promise((r) => setTimeout(r, 150));
        return { status: 201, body: { messageId: "<x@y>" } };
      },
    });
    const u = await openIncident();
    await Promise.all(Array.from({ length: 5 }, () => processNotificationOutbox({ onlyUserIds: [u.userId] })));
    assert.equal(calls.filter((c) => c.provider === "telegram").length, 1);
    assert.equal(calls.filter((c) => c.provider === "brevo").length, 1);
  });

  it("a channel turned off after queuing is skipped, not sent", async () => {
    const calls = mock({ telegram: telegramOk, brevo: brevoOk });
    const u = await openIncident();
    await prisma.notificationSettings.update({ where: { userId: u.userId }, data: { emailOnIncident: false } });
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal(calls.filter((c) => c.provider === "brevo").length, 0);
    assert.equal((await deliveryFor(u.userId, "EMAIL")).status, "SKIPPED");
  });

  it("drops alerts that are too old to be useful", async () => {
    const calls = mock({ telegram: telegramOk, brevo: brevoOk });
    const u = await openIncident();
    await prisma.notificationEvent.updateMany({ where: { userId: u.userId }, data: { createdAt: new Date(Date.now() - MAX_EVENT_AGE_MS - 60_000) } });
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal(calls.length, 0);
    assert.equal((await deliveryFor(u.userId, "TELEGRAM")).lastError, "EXPIRED");
  });

  it("a recovery notice waits for its alert, and is sent after it", async () => {
    let telegramCalls = 0;
    const calls = mock({
      telegram: () => (++telegramCalls === 1 ? { status: 502, body: { ok: false, error_code: 502, description: "Bad Gateway" } } : { status: 200, body: { ok: true, result: { message_id: telegramCalls } } }),
      brevo: brevoOk,
    });
    const u = await openIncident();
    await recordCheck(u, "OPERATIONAL"); // resolved while the Telegram alert is still failing
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    const telegramTexts = () => calls.filter((c) => c.provider === "telegram").map((c) => String(c.body.text));
    assert.equal(telegramTexts().length, 1, "recovery must not be sent before the alert");
    assert.match(telegramTexts()[0], /Service down/);

    await makeDueNow(u.userId);
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    await makeDueNow(u.userId);
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal(telegramTexts().length, 3); // failed alert, alert retry, recovery
    assert.match(telegramTexts()[1], /Service down/);
    assert.match(telegramTexts()[2], /Recovered/);
  });

  it("a recovery notice is skipped if its alert never reached the user", async () => {
    const calls = mock({ telegram: () => ({ status: 403, body: { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" } }), brevo: brevoOk });
    const u = await openIncident();
    await recordCheck(u, "OPERATIONAL");
    for (let i = 0; i < 3; i++) {
      await makeDueNow(u.userId);
      await processNotificationOutbox({ onlyUserIds: [u.userId] });
    }
    assert.equal(calls.filter((c) => c.provider === "telegram").length, 1);
    assert.equal((await deliveryFor(u.userId, "TELEGRAM", "INCIDENT_RESOLVED")).lastError, "RECOVERY_WITHOUT_ALERT");
    assert.equal((await deliveryFor(u.userId, "EMAIL", "INCIDENT_RESOLVED")).status, "SENT");
  });

  it("a manually resolved automatic incident sends one recovery notice", async () => {
    const calls = mock({ telegram: telegramOk, brevo: brevoOk });
    const u = await openIncident();
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    const [event] = await events(u.userId);
    await setIncidentStatus(event.incidentId!, "RESOLVED");
    await setIncidentStatus(event.incidentId!, "RESOLVED");
    await processNotificationOutbox({ onlyUserIds: [u.userId] });
    assert.equal(calls.filter((c) => c.provider === "telegram" && /Recovered/.test(String(c.body.text))).length, 1);
  });
});

describe("backoff and error classification", () => {
  it("backs off exponentially within a cap", () => {
    const mid = () => 0.5;
    assert.equal(backoffMs(1, mid), 60_000);
    assert.equal(backoffMs(2, mid), 120_000);
    assert.equal(backoffMs(3, mid), 240_000);
    assert.equal(backoffMs(20, mid), 15 * 60_000);
  });

  it("classifies Telegram errors", () => {
    assert.deepEqual(classifyTelegramFailure(429, { ok: false, error_code: 429, parameters: { retry_after: 5 } }), { kind: "transient", code: "PROVIDER_RATE_LIMITED", retryAfterMs: 5000 });
    assert.equal(classifyTelegramFailure(502, null).kind, "transient");
    assert.deepEqual(classifyTelegramFailure(403, { ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }), { kind: "permanent", code: "TELEGRAM_BLOCKED" });
    assert.deepEqual(classifyTelegramFailure(400, { ok: false, error_code: 400, description: "Bad Request: chat not found" }), { kind: "permanent", code: "TELEGRAM_CHAT_NOT_FOUND" });
    assert.deepEqual(classifyTelegramFailure(401, { ok: false, error_code: 401 }), { kind: "permanent", code: "PROVIDER_UNAUTHORIZED" });
  });

  it("classifies Brevo errors", () => {
    assert.equal(classifyBrevoFailure(429, null, new Headers({ "retry-after": "30" })).kind, "transient");
    assert.equal(classifyBrevoFailure(500, null).kind, "transient");
    assert.deepEqual(classifyBrevoFailure(401, { code: "unauthorized" }), { kind: "permanent", code: "PROVIDER_UNAUTHORIZED" });
    assert.deepEqual(classifyBrevoFailure(400, { message: "Sender is invalid" }), { kind: "permanent", code: "EMAIL_SENDER_INVALID" });
  });
});

describe("message templates", () => {
  const payload = { kind: "incident" as const, incidentId: "inc1", title: "x", severity: "CRITICAL" as const, startedAt: "2026-10-16T10:00:00.000Z", occurredAt: "2026-10-16T10:00:00.000Z", services: [{ name: "<script>alert(1)</script>", url: "https://x.test/?a=1&b=2" }] };

  it("escapes service data in email and Telegram messages", () => {
    const email = renderEmail("INCIDENT_OPENED", payload);
    assert.ok(!email.html.includes("<script>"));
    assert.ok(email.html.includes("&lt;script&gt;"));
    assert.ok(!renderTelegram("INCIDENT_OPENED", payload).includes("<script>"));
    assert.match(email.html, /https:\/\/app\.example\.test\/incidents\/inc1/);
  });

  it("distinguishes down from recovered", () => {
    assert.match(renderEmail("INCIDENT_OPENED", payload).subject, /Service down/);
    const resolved = renderEmail("INCIDENT_RESOLVED", { ...payload, resolvedAt: "2026-10-16T10:06:12.000Z", durationSeconds: 372 });
    assert.match(resolved.subject, /Recovered/);
    assert.match(resolved.text, /6m 12s/);
  });
});
