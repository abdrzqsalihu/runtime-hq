import { NextRequest, NextResponse } from "next/server";
import { failure, sessionUser, unauthorized } from "@/lib/notifications/http";
import { createTelegramLink } from "@/lib/notifications/settings";

/** Create a short-lived, single-use link token bound to the signed-in user and return the bot deep link. */
export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    const link = await createTelegramLink(user.id);
    return NextResponse.json({ url: link.url, botUsername: link.botUsername, expiresAt: link.expiresAt }, { status: 201 });
  } catch (err) {
    return failure(err);
  }
}
