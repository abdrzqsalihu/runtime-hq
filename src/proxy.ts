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
    const { pathname } = request.nextUrl;
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
    const isLanding = pathname === "/";
    // Accessible regardless of session state: there's no "change password" option in Settings yet,
    // so a signed-in user who wants to set a new password still needs this flow.
    const isPasswordResetFlow = pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");

    const authenticated = await hasValidSession(request);

    if (!authenticated && !isAuthPage && !isLanding && !isPasswordResetFlow) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (authenticated && isAuthPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
