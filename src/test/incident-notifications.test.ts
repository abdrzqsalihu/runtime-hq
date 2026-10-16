import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { cleanup, events, incidents, makeUser, recordCheck } from "./helpers";
import { prisma } from "@/lib/db";
import { handleServiceStatusTransition, setIncidentStatus } from "@/lib/incident-manager";

after(cleanup);

describe("incident lifecycle → notification events", () => {
  it("a failure below the threshold opens no incident and queues nothing", async () => {
    const u = await makeUser();
    await recordCheck(u, "OUTAGE"); // threshold is 2
    assert.equal((await incidents(u.userId)).length, 0);
    assert.equal((await events(u.userId)).length, 0);
  });

  it("a failing run that is broken by a healthy check does not count", async () => {
    const u = await makeUser();
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OPERATIONAL");
    await recordCheck(u, "OUTAGE");
    assert.equal((await incidents(u.userId)).length, 0);
    assert.equal((await events(u.userId)).length, 0);
  });

  it("reaching the threshold opens one incident and exactly one alert, with a delivery per enabled channel", async () => {
    const u = await makeUser();
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    const incs = await incidents(u.userId);
    const evs = await events(u.userId);
    assert.equal(incs.length, 1);
    assert.equal(incs[0].automatic, true);
    assert.equal(evs.length, 1);
    assert.equal(evs[0].type, "INCIDENT_OPENED");
    assert.deepEqual(evs[0].deliveries.map((d) => d.channel).sort(), ["EMAIL", "TELEGRAM"]);
    assert.ok(evs[0].deliveries.every((d) => d.status === "PENDING"));
  });

  it("further failing checks on an open incident create no more incidents or alerts", async () => {
    const u = await makeUser();
    for (let i = 0; i < 6; i++) await recordCheck(u, "OUTAGE");
    assert.equal((await incidents(u.userId)).length, 1);
    assert.equal((await events(u.userId)).length, 1);
  });

  it("concurrent evaluations of the same failing service produce a single alert", async () => {
    const u = await makeUser();
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    await Promise.all(Array.from({ length: 6 }, () => handleServiceStatusTransition(u.serviceId, u.serviceName, u.userId, "OUTAGE")));
    assert.equal((await incidents(u.userId)).length, 1);
    assert.equal((await events(u.userId)).length, 1);
  });

  it("recovery resolves the incident and queues exactly one recovery notice with the duration", async () => {
    const u = await makeUser();
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OPERATIONAL");
    await recordCheck(u, "OPERATIONAL"); // already healthy: nothing more
    const [incident] = await incidents(u.userId);
    assert.equal(incident.status, "RESOLVED");
    assert.ok(incident.resolvedAt);
    const evs = await events(u.userId);
    assert.deepEqual(evs.map((e) => e.type), ["INCIDENT_OPENED", "INCIDENT_RESOLVED"]);
    const payload = evs[1].payload as { durationSeconds?: number };
    assert.equal(typeof payload.durationSeconds, "number");
  });

  it("no recovery notice is queued for an incident that was never alerted", async () => {
    const u = await makeUser();
    const incident = await prisma.incident.create({
      data: { title: "no alert", severity: "MEDIUM", automatic: true, userId: u.userId, services: { create: [{ serviceId: u.serviceId }] } },
    });
    await setIncidentStatus(incident.id, "RESOLVED");
    assert.equal((await events(u.userId)).length, 0);
  });

  it("reopening a resolved incident starts a new cycle with a new alert, and resolving again a new recovery", async () => {
    const u = await makeUser();
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    const [incident] = await incidents(u.userId);
    await setIncidentStatus(incident.id, "RESOLVED"); // manual resolve of an automatic incident
    await setIncidentStatus(incident.id, "INVESTIGATING"); // reopened
    await setIncidentStatus(incident.id, "INVESTIGATING"); // no-op
    await setIncidentStatus(incident.id, "RESOLVED");
    const evs = await events(u.userId);
    assert.deepEqual(evs.map((e) => e.type), ["INCIDENT_OPENED", "INCIDENT_RESOLVED", "INCIDENT_OPENED", "INCIDENT_RESOLVED"]);
    assert.equal(new Set(evs.map((e) => e.idempotencyKey)).size, 4);
    assert.equal((await prisma.incident.findUniqueOrThrow({ where: { id: incident.id } })).notifyCycle, 2);
  });

  it("a channel the user turned off gets no delivery", async () => {
    const u = await makeUser({ emailOnIncident: false });
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    const [event] = await events(u.userId);
    assert.deepEqual(event.deliveries.map((d) => d.channel), ["TELEGRAM"]);
  });

  it("a channel that was never configured gets no delivery, but the incident is still recorded", async () => {
    const u = await makeUser({ email: false, telegram: false });
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    assert.equal((await incidents(u.userId)).length, 1);
    const [event] = await events(u.userId);
    assert.equal(event.deliveries.length, 0);
  });

  it("recovery never resolves a manually declared incident", async () => {
    const u = await makeUser();
    const manual = await prisma.incident.create({
      data: { title: "manual", severity: "LOW", userId: u.userId, services: { create: [{ serviceId: u.serviceId }] } },
    });
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OUTAGE");
    await recordCheck(u, "OPERATIONAL");
    assert.equal((await prisma.incident.findUniqueOrThrow({ where: { id: manual.id } })).status, "INVESTIGATING");
    assert.equal((await events(u.userId)).every((e) => e.incidentId !== manual.id), true);
  });
});
