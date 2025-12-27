import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    // Only rely on the Firebase session cookie to match src/lib/auth-context.ts logic
    const firebaseSession = request.cookies.get("session");
    const isAuthenticated = !!firebaseSession;

    const isLoginPage = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/login-v2";

    // Public paths that don't need auth
    const isPublicPath =
        request.nextUrl.pathname === "/" || // Root is now public
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/static") ||
        request.nextUrl.pathname.includes(".") || // files like favicon.ico, manifest.json
        request.nextUrl.pathname.startsWith("/api/og") || // Social preview images if any
        request.nextUrl.pathname.startsWith("/trip") || // Public trip view
        request.nextUrl.pathname.startsWith("/group") || // Public group view
        request.nextUrl.pathname.startsWith("/share") || // NEW: Shared public links
        request.nextUrl.pathname === "/release-notes"; // Public release notes

    if (isPublicPath) {
        // Special case: If user hits /login, we want to show homepage with modal
        if (request.nextUrl.pathname === "/login") {
            return NextResponse.redirect(new URL("/?login=true", request.url));
        }
        return NextResponse.next();
    }

    // Handle /login specifically if it falls through (though it shouldn't be public usually? Wait, /login WAS public)
    // Actually, I should remove /login checks from elsewhere if I want it to purely redirect.
    // Let's refine:

    if (request.nextUrl.pathname === "/login") {
        return NextResponse.redirect(new URL("/?login=true", request.url));
    }

    // If not logged in and not on login page -> Redirect to Login V2
    if (!isAuthenticated && !isLoginPage) {
        // Redirect to V2 login by default now
        return NextResponse.redirect(new URL("/login-v2", request.url));
    }

    // If logged in and ON login page -> Redirect to Home
    if (isAuthenticated && isLoginPage) {
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
