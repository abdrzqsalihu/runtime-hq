import { NextRequest, NextResponse } from "next/server";
import { failure, sessionUser, unauthorized } from "@/lib/notifications/http";
import { sendTestNotification } from "@/lib/notifications/settings";

export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    await sendTestNotification(user.id, "TELEGRAM");
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}
