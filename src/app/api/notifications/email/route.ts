import { NextRequest, NextResponse } from "next/server";
import { failure, sessionUser, unauthorized } from "@/lib/notifications/http";
import { removeEmail, startEmailVerification } from "@/lib/notifications/settings";

/** Start confirming a notification address: emails a single-use link to that address. */
export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    const body = (await req.json().catch(() => null)) as { address?: unknown } | null;
    const result = await startEmailVerification(user.id, body?.address);
    return NextResponse.json({ pendingAddress: result.address, expiresAt: result.expiresAt }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    await removeEmail(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}
