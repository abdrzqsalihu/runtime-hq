import { NextRequest, NextResponse } from "next/server";
import { failure, sessionUser, unauthorized } from "@/lib/notifications/http";
import { confirmEmailToken } from "@/lib/notifications/settings";

/** Confirm the token that was emailed. The token only works for the account that requested it. */
export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
    const result = await confirmEmailToken(user.id, body?.token);
    return NextResponse.json({ address: result.address });
  } catch (err) {
    return failure(err);
  }
}
