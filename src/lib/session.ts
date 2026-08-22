import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function getSession() {
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get("better-auth.session_token")?.value ||
    cookieStore.get("__Secure-better-auth.session_token")?.value ||
    cookieStore.get("__Host-better-auth.session_token")?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return { user: session.user, session };
}
