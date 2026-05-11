import { type NextRequest, NextResponse } from "next/server";

export default async function middleware(request: NextRequest) {
    const cookies = request.cookies.getAll();
    const sessionCookie = cookies.find(c => 
        c.name === "better-auth.session_token" || 
        c.name === "__Secure-better-auth.session_token" ||
        c.name === "__Host-better-auth.session_token"
    );

    const isAuthPage = request.nextUrl.pathname.startsWith("/login") || 
                      request.nextUrl.pathname.startsWith("/register");

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
