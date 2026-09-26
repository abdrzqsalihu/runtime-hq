import { prisma } from "@/lib/db";
import { ServiceStatus } from "@prisma/client/index.js";

/** Latest checks the service list and the service detail page render. */
export const LIST_CHECK_LIMIT = 30;
export const DETAIL_CHECK_LIMIT = 50;

/** The one uptime definition used across the app: share of OPERATIONAL checks in this window. */
export const UPTIME_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Latest `limit` checks per service, newest first.
 *
 * A nested `include: { checks: { take } }` does not push the limit into SQL (Prisma loads every
 * check row for the services and slices in memory). One `findMany` per service is a bounded
 * `ORDER BY checkedAt DESC LIMIT n` served by the (serviceId, checkedAt) index.
 */
export async function recentChecksByService(serviceIds: string[], limit: number) {
  const entries = await Promise.all(
    serviceIds.map(
      async (serviceId) =>
        [
          serviceId,
          await prisma.serviceCheck.findMany({
            where: { serviceId },
            orderBy: { checkedAt: "desc" },
            take: limit,
          }),
        ] as const
    )
  );
  return new Map(entries);
}

export interface Uptime24h {
  uptimePercent: number | null;
  checks24h: number;
}

/** 24h uptime per service from persisted checks. null when there were no checks in the window. */
export async function uptime24hByService(serviceIds: string[]): Promise<Map<string, Uptime24h>> {
  const result = new Map<string, Uptime24h>();
  if (serviceIds.length === 0) return result;

  const since = new Date(Date.now() - UPTIME_WINDOW_MS);
  const grouped = await prisma.serviceCheck.groupBy({
    by: ["serviceId", "status"],
    where: { serviceId: { in: serviceIds }, checkedAt: { gte: since } },
    _count: { _all: true },
  });

  const totals = new Map<string, { ok: number; all: number }>();
  for (const row of grouped) {
    const entry = totals.get(row.serviceId) ?? { ok: 0, all: 0 };
    entry.all += row._count._all;
    if (row.status === ServiceStatus.OPERATIONAL) entry.ok += row._count._all;
    totals.set(row.serviceId, entry);
  }

  for (const serviceId of serviceIds) {
    const entry = totals.get(serviceId);
    result.set(serviceId, {
      uptimePercent: entry && entry.all > 0 ? Number(((entry.ok / entry.all) * 100).toFixed(2)) : null,
      checks24h: entry?.all ?? 0,
    });
  }
  return result;
}
