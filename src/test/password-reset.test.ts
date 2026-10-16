import { after, afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { brevoOk, installFetchMock } from "./helpers";

const TEST_PREFIX = "pwreset-";
const created: string[] = [];

after(async () => {
  await prisma.user.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

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

/** One real account, created through Better Auth itself (real password hashing, real session support). */
async function makeAccount(password = "OriginalPass123!") {
  const id = `${TEST_PREFIX}${randomUUID()}`;
  const email = `${id}@example.com`;
  created.push(id);
  await auth.api.signUpEmail({ body: { email, password, name: "Reset Tester" } });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, email, password };
}

const ipHeaders = (ip: string) => new Headers({ "x-forwarded-for": ip });
const freshIp = () => `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}.1`;
const BASE = "https://app.example.test/api/auth";

/**
 * Rate limiting lives in the HTTP handler wrapper, not in the bare `auth.api.*` functions (which
 * are for internal/server use and skip that middleware). Going through `auth.handler` with a real
 * Request is what `/api/auth/*` actually serves, and it's the only path that is rate-limited.
 */
async function callAuthHandler(path: string, body: unknown, ip: string) {
  const res = await auth.handler(
    new Request(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function requestReset(email: string, ip = freshIp()) {
  const result = await auth.api.requestPasswordReset({ body: { email }, headers: ipHeaders(ip), returnHeaders: false });
  return result as { status: boolean };
}

/** Reads the token from the outgoing Brevo email body (the real server-generated reset link), never fabricated. */
function tokenFromCalls(calls: ReturnType<typeof mock>) {
  const call = calls.at(-1);
  assert.ok(call, "expected a Brevo send");
  const html = String(call!.body.htmlContent);
  const match = /reset-password\?token=([A-Za-z0-9_-]+)/.exec(html);
  assert.ok(match, "expected a reset link in the email body");
  return match![1];
}

async function signInOk(email: string, password: string): Promise<boolean> {
  try {
    await auth.api.signInEmail({ body: { email, password }, headers: ipHeaders(freshIp()) });
    return true;
  } catch {
    return false;
  }
}

describe("forgot password: public response", () => {
  it("a registered and an unregistered email get the same response shape", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    const known = await requestReset(account.email);
    const unknown = await requestReset(`nobody-${randomUUID()}@example.com`);
    assert.deepEqual(Object.keys(known).sort(), Object.keys(unknown).sort());
    assert.equal(known.status, true);
    assert.equal(unknown.status, true);
    // Only the real account actually gets an email.
    assert.equal(calls.filter((c) => c.provider === "brevo").length, 1);
  });

  it("emails a real, single-use token link built from the configured app URL, not a request header", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const mail = calls.at(-1)!.body as { to: Array<{ email: string }>; subject: string; htmlContent: string };
    assert.equal(mail.to[0].email, account.email);
    assert.match(String(mail.subject), /Reset your Runtime HQ password/);
    assert.match(String(mail.htmlContent), new RegExp(`^https://app\\.example\\.test/reset-password\\?token=|https://app\\.example\\.test/reset-password\\?token=`));
    assert.ok(/https:\/\/app\.example\.test\/reset-password\?token=[A-Za-z0-9_-]+/.test(mail.htmlContent));
    assert.match(String(mail.htmlContent), /30 minutes/);
  });

  it("never logs the token, the reset URL, or the password", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
    try {
      await requestReset(account.email);
      const token = tokenFromCalls(calls);
      await auth.api.resetPassword({ body: { token, newPassword: "BrandNewPass123!" } });
      const combined = logs.join("\n");
      assert.ok(!combined.includes(token));
      assert.ok(!combined.includes("BrandNewPass123!"));
      assert.ok(!combined.includes(account.password));
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });

  it("does not expose whether the account exists if the email provider fails", async () => {
    mock({ brevo: () => ({ status: 503, body: { code: "service_unavailable" } }) });
    const account = await makeAccount();
    const result = await requestReset(account.email); // must not throw even though the send failed
    assert.equal(result.status, true);
  });
});

describe("resetting the password", () => {
  it("accepts a valid token, hashes the new password, and the user can sign in with it (not the old one)", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const token = tokenFromCalls(calls);

    await auth.api.resetPassword({ body: { token, newPassword: "BrandNewPass123!" } });

    assert.equal(await signInOk(account.email, "BrandNewPass123!"), true);
    assert.equal(await signInOk(account.email, account.password), false);

    const accountRow = await prisma.account.findFirstOrThrow({ where: { userId: account.id, providerId: "credential" } });
    assert.notEqual(accountRow.password, "BrandNewPass123!"); // stored hashed, not plaintext
  });

  it("rejects a token that was already used", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const token = tokenFromCalls(calls);

    await auth.api.resetPassword({ body: { token, newPassword: "FirstNewPass123!" } });
    await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: "SecondNewPass123!" } }));
    assert.equal(await signInOk(account.email, "FirstNewPass123!"), true);
  });

  it("rejects an expired token", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const token = tokenFromCalls(calls);
    await prisma.verification.updateMany({ where: { identifier: `reset-password:${token}` }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: "NewPass123!" } }));
  });

  it("rejects a malformed or unknown token", async () => {
    await assert.rejects(auth.api.resetPassword({ body: { token: "not-a-real-token", newPassword: "NewPass123!" } }));
  });

  it("rejects passwords shorter than the minimum", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const token = tokenFromCalls(calls);
    await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: "short" } }));
  });

  it("concurrent reset requests with the same token do not both end up usable afterwards", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const token = tokenFromCalls(calls);

    const results = await Promise.allSettled([
      auth.api.resetPassword({ body: { token, newPassword: "ConcurrentA123!" } }),
      auth.api.resetPassword({ body: { token, newPassword: "ConcurrentB123!" } }),
    ]);
    // Whichever password "won", the token must now be rejected for any further use.
    await assert.rejects(auth.api.resetPassword({ body: { token, newPassword: "ConcurrentC123!" } }));
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    assert.ok(succeeded >= 1);
    const worksWithA = await signInOk(account.email, "ConcurrentA123!");
    const worksWithB = await signInOk(account.email, "ConcurrentB123!");
    assert.equal(worksWithA || worksWithB, true);
  });

  it("revokes existing sessions on a successful reset", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await prisma.session.create({
      data: { id: randomUUID(), userId: account.id, token: randomUUID(), expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date(), updatedAt: new Date() },
    });
    assert.ok((await prisma.session.count({ where: { userId: account.id } })) > 0);

    await requestReset(account.email);
    const token = tokenFromCalls(calls);
    await auth.api.resetPassword({ body: { token, newPassword: "BrandNewPass123!" } });

    assert.equal(await prisma.session.count({ where: { userId: account.id } }), 0);
  });

  it("does not sign the user in as a side effect of resetting", async () => {
    const calls = mock({ brevo: brevoOk });
    const account = await makeAccount();
    await requestReset(account.email);
    const token = tokenFromCalls(calls);
    const result = await auth.api.resetPassword({ body: { token, newPassword: "BrandNewPass123!" } });
    assert.equal(await prisma.session.count({ where: { userId: account.id } }), 0);
    assert.ok(!("session" in (result as object)) && !("token" in (result as object)));
  });
});

describe("rate limiting", () => {
  it("limits repeated reset requests from the same origin (custom rule: 5 per 15 min)", async () => {
    mock({ brevo: brevoOk });
    const account = await makeAccount();
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const { status } = await callAuthHandler("/request-password-reset", { email: account.email }, ip);
      statuses.push(status);
    }
    assert.ok(statuses.includes(429), `expected a 429 among ${statuses.join(",")}`);
    assert.ok(statuses.slice(0, 5).every((s) => s === 200), "the first 5 requests should be allowed");
  });

  it("a different origin is not affected by another origin's rate limit", async () => {
    mock({ brevo: brevoOk });
    const account = await makeAccount();
    const ipA = freshIp();
    for (let i = 0; i < 6; i++) await callAuthHandler("/request-password-reset", { email: account.email }, ipA);
    const fromB = await callAuthHandler("/request-password-reset", { email: account.email }, freshIp());
    assert.equal(fromB.status, 200);
  });

  it("limits repeated token-verification attempts from the same origin (custom rule: 10 per 15 min)", async () => {
    mock({ brevo: brevoOk });
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 13; i++) {
      const { status } = await callAuthHandler("/reset-password", { token: `bad-token-${i}`, newPassword: "WhateverPass123!" }, ip);
      statuses.push(status);
    }
    assert.ok(statuses.includes(429), `expected a 429 among ${statuses.join(",")}`);
  });
});
