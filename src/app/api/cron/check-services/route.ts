import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkService } from "@/lib/health-check";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  const services = await prisma.service.findMany({
    select: { id: true },
  });

  const results = await Promise.all(
    services.map((service) => checkService(service.id).catch((err) => ({ error: err.message, serviceId: service.id })))
  );

  return NextResponse.json({ ok: true, results });
}
