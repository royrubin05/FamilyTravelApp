import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const session = request.cookies.get("auth_session");
    const isLoginPage = request.nextUrl.pathname === "/login";

    // Public paths that don't need auth
    const isPublicPath =
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/static") ||
        request.nextUrl.pathname.includes(".") || // files like favicon.ico, manifest.json
        request.nextUrl.pathname.startsWith("/api/og") || // Social preview images if any
        request.nextUrl.pathname.startsWith("/trip") || // Public trip view
        request.nextUrl.pathname.startsWith("/share"); // Public shared trip view

    if (isPublicPath) {
        return NextResponse.next();
    }

    // If not logged in and not on login page -> Redirect to Login
    if (!session && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If logged in and ON login page -> Redirect to Home
    if (session && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
