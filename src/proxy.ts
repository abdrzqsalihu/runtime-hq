import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

async function hasValidSession(request: NextRequest): Promise<boolean> {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        return !!session?.user;
    } catch (error) {
        console.error("Session validation failed in proxy:", error);
        return false;
    }
}

export async function proxy(request: NextRequest) {
    const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                      request.nextUrl.pathname.startsWith("/register");

    const authenticated = await hasValidSession(request);

    if (!authenticated && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (authenticated && isAuthPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
