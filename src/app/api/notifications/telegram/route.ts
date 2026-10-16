import { NextRequest, NextResponse } from "next/server";
import { failure, sessionUser, unauthorized } from "@/lib/notifications/http";
import { disconnectTelegram } from "@/lib/notifications/settings";

export async function DELETE(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    await disconnectTelegram(user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}
