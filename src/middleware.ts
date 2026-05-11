import { type NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
    const allCookies = request.cookies.getAll();
    
    // Check for any cookie that looks like a Better-Auth session token
    // We check for development, production (__Secure-), and strict production (__Host-) variants
    const sessionCookie = allCookies.find(c => 
        c.name.includes("better-auth.session_token") || 
        c.name.includes("auth_session")
    );

    const isAuthPage = request.nextUrl.pathname.startsWith("/login") || 
                      request.nextUrl.pathname.startsWith("/register");

    // Debug logging for Vercel logs to see what cookies are actually being sent
    if (process.env.NODE_ENV === "production") {
        console.log(`[Middleware] Path: ${request.nextUrl.pathname} | Session found: ${!!sessionCookie} | Cookie names: ${allCookies.map(c => c.name).join(", ")}`);
    }

    if (!sessionCookie && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (sessionCookie && isAuthPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}
    if (!sessionCookie && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (sessionCookie && isAuthPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
