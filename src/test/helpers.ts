/**
 * Shared test helpers. Tests run against the database in DATABASE_URL using disposable users whose
 * email starts with TEST_PREFIX; every row they create hangs off those users and is removed with them.
 * Outbound provider calls are intercepted by `installFetchMock`, so nothing real is ever sent.
 */
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-webhook-secret";
process.env.BREVO_API_KEY = "test-brevo-key";
process.env.BREVO_SENDER_EMAIL = "alerts@example.test";
process.env.BREVO_SENDER_NAME = "Runtime HQ Test";
process.env.INCIDENT_FAILURE_THRESHOLD = "2";
process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { handleServiceStatusTransition } from "@/lib/incident-manager";

export const TEST_PREFIX = "test-notif-";
const createdUserIds: string[] = [];

export async function makeUser(options: { email?: boolean; telegram?: boolean; emailOnIncident?: boolean } = {}) {
  const id = `${TEST_PREFIX}${randomUUID()}`;
  const email = `${id}@example.com`;
  createdUserIds.push(id);
  await prisma.user.create({ data: { id, name: "Test User", email, emailVerified: false, createdAt: new Date(), updatedAt: new Date() } });
  const service = await prisma.service.create({
    data: { slug: "svc", name: "ORDERS_API", category: "API_NODES", endpointUrl: "https://orders.example.test/health", region: "GLOBAL_EDGE", userId: id },
  });
  await prisma.notificationSettings.create({
    data: {
      userId: id,
      ...(options.email === false ? {} : { emailAddress: email, emailVerifiedAt: new Date() }),
      ...(options.telegram === false ? {} : { telegramChatId: `chat-${randomUUID()}`, telegramDisplayName: "@tester" }),
      ...(options.emailOnIncident === false ? { emailOnIncident: false } : {}),
    },
  });
  return { userId: id, email, serviceId: service.id, serviceName: service.name };
}

/** Record one check result the way the check engine does, then run incident evaluation. */
export async function recordCheck(user: { userId: string; serviceId: string; serviceName: string }, status: "OPERATIONAL" | "DEGRADED" | "OUTAGE") {
  await prisma.serviceCheck.create({
    data: { serviceId: user.serviceId, status, latencyMs: status === "OPERATIONAL" ? 100 : 3000, httpStatus: status === "OPERATIONAL" ? 200 : null, errorRate: status === "OPERATIONAL" ? 0 : 100, message: status === "OPERATIONAL" ? "OK" : "TIMEOUT" },
  });
  await prisma.service.update({ where: { id: user.serviceId }, data: { status } });
  await handleServiceStatusTransition(user.serviceId, user.serviceName, user.userId, status);
}

export const events = (userId: string) => prisma.notificationEvent.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, include: { deliveries: true } });
export const incidents = (userId: string) => prisma.incident.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });

/** Remove only the users this test file created (files run in parallel against one database). */
export async function cleanup() {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
}

export interface ProviderCall {
  provider: "telegram" | "brevo";
  url: string;
  body: Record<string, unknown>;
}

type Responder = (call: ProviderCall, count: number) => { status: number; body: unknown; headers?: Record<string, string> } | Promise<{ status: number; body: unknown; headers?: Record<string, string> }>;

const realFetch = globalThis.fetch;

/** Replace fetch with a scripted fake for the two providers. Returns the recorded calls. */
export function installFetchMock(handlers: { telegram?: Responder; brevo?: Responder }) {
  const calls: ProviderCall[] = [];
  const counts = { telegram: 0, brevo: 0 };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const provider = url.includes("api.telegram.org") ? "telegram" : url.includes("api.brevo.com") ? "brevo" : null;
    if (!provider) throw new Error(`Unexpected outbound request in test: ${url}`);
    const call: ProviderCall = { provider, url, body: JSON.parse(String(init?.body ?? "{}")) };
    calls.push(call);
    counts[provider]++;
    const responder = handlers[provider];
    const reply = responder ? await responder(call, counts[provider]) : provider === "telegram" ? { status: 200, body: { ok: true, result: { message_id: 1 } } } : { status: 201, body: { messageId: `<${randomUUID()}@smtp-relay.test>` } };
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json", ...(reply.headers ?? {}) } });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = realFetch; } };
}

export const telegramOk: Responder = () => ({ status: 200, body: { ok: true, result: { message_id: 7 } } });
export const brevoOk: Responder = () => ({ status: 201, body: { messageId: `<${randomUUID()}@smtp-relay.test>` } });

export async function makeDueNow(userId: string) {
  await prisma.notificationDelivery.updateMany({ where: { userId, status: "PENDING" }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
}
