import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { NotificationError } from "./settings";

/** The signed-in user for this request, or null. Every settings/test/link endpoint starts here. */
export async function sessionUser(req: NextRequest): Promise<{ id: string; email: string } | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user ? { id: session.user.id, email: session.user.email } : null;
}

export const unauthorized = () => NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

/** Convert known failures to safe responses; anything unexpected becomes a generic 500 with no details. */
export function failure(err: unknown): NextResponse {
  if (err instanceof NotificationError) {
    return NextResponse.json(
      { error: err.code, message: err.message, ...(err.retryAfterSeconds ? { retryAfter: err.retryAfterSeconds } : {}) },
      { status: err.status, headers: err.retryAfterSeconds ? { "Retry-After": String(err.retryAfterSeconds) } : undefined },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "INVALID_INPUT", message: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  console.error("Notification request failed", err instanceof Error ? err.name : "error");
  return NextResponse.json({ error: "INTERNAL_ERROR", message: "Something went wrong." }, { status: 500 });
}
