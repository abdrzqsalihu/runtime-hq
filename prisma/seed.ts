import { PrismaClient, ServiceStatus, IncidentSeverity, IncidentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const seedServices = [
    {
      slug: "stripe-api",
      name: "STRIPE_API",
      category: "THIRD_PARTY_APIS",
      endpointUrl: "https://api.stripe.com",
      region: "GLOBAL_EDGE",
      status: ServiceStatus.OPERATIONAL,
      lastLatencyMs: 124,
      lastErrorRate: 0.01,
      lastHeartbeatAt: new Date(),
    },
    {
      slug: "aws-us-east-1",
      name: "AWS_INFRA_CORE",
      category: "CORE_INFRA",
      endpointUrl: "https://aws.amazon.com",
      region: "US_EAST_1",
      status: ServiceStatus.DEGRADED,
      lastLatencyMs: 245,
      lastErrorRate: 1.24,
      lastHeartbeatAt: new Date(),
    },
    {
      slug: "github-actions",
      name: "GITHUB_ACTIONS",
      category: "THIRD_PARTY_APIS",
      endpointUrl: "https://api.github.com",
      region: "GLOBAL_EDGE",
      status: ServiceStatus.OPERATIONAL,
      lastLatencyMs: 89,
      lastErrorRate: 0,
      lastHeartbeatAt: new Date(),
    },
    {
      slug: "sendgrid-relay",
      name: "SENDGRID_RELAY",
      category: "MESSAGING",
      endpointUrl: "https://api.sendgrid.com",
      region: "US_WEST_2",
      status: ServiceStatus.OUTAGE,
      lastLatencyMs: null,
      lastErrorRate: 100,
      lastHeartbeatAt: new Date(Date.now() - 45_000),
    },
  ];

  for (const s of seedServices) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        name: s.name,
        category: s.category,
        endpointUrl: s.endpointUrl,
        region: s.region,
        status: s.status,
        lastLatencyMs: s.lastLatencyMs ?? null,
        lastErrorRate: s.lastErrorRate ?? null,
        lastHeartbeatAt: s.lastHeartbeatAt,
      },
      create: s,
    });
  }

  const existing = await prisma.incident.findFirst({
    where: { title: "DISTRIBUTED_API_LATENCY_SPIKE" },
    orderBy: { startedAt: "desc" },
  });

  const incident =
    existing ??
    (await prisma.incident.create({
      data: {
        title: "DISTRIBUTED_API_LATENCY_SPIKE",
        status: IncidentStatus.INVESTIGATING,
        severity: IncidentSeverity.CRITICAL,
        startedAt: new Date(Date.now() - 24 * 60 * 1000),
        events: {
          create: [
            {
              message: "Initial spike detected across ingress gateways",
              severity: IncidentSeverity.CRITICAL,
              region: "GLOBAL_EDGE",
            },
            {
              message: "Auto-throttling applied to noisy neighbors",
              severity: IncidentSeverity.MEDIUM,
              region: "US_EAST_1",
            },
          ],
        },
      },
    }));

  const stripe = await prisma.service.findUnique({ where: { slug: "stripe-api" } });
  const vercel = await prisma.service.findUnique({ where: { slug: "aws-us-east-1" } });

  const links = [
    stripe ? { incidentId: incident.id, serviceId: stripe.id } : null,
    vercel ? { incidentId: incident.id, serviceId: vercel.id } : null,
  ].filter(Boolean) as { incidentId: string; serviceId: string }[];

  for (const link of links) {
    await prisma.incidentService.upsert({
      where: {
        incidentId_serviceId: { incidentId: link.incidentId, serviceId: link.serviceId },
      },
      update: {},
      create: link,
    });
  }

  const seededServices = await prisma.service.count();
  const seededIncidents = await prisma.incident.count();
  return { seededServices, seededIncidents };
}

main()
  .then((result) => {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  })
  .catch((e) => {
    process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
