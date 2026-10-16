import { NextRequest, NextResponse } from "next/server";
import { failure, sessionUser, unauthorized } from "@/lib/notifications/http";
import { getNotificationOverview, updatePreferences } from "@/lib/notifications/settings";

export async function GET(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    return NextResponse.json(await getNotificationOverview(user.id));
  } catch (err) {
    return failure(err);
  }
}

export async function PATCH(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return unauthorized();
  try {
    await updatePreferences(user.id, await req.json().catch(() => null));
    return NextResponse.json(await getNotificationOverview(user.id));
  } catch (err) {
    return failure(err);
  }
}
