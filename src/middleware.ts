import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Define Sessions
    const userSession = request.cookies.get("session")?.value;
    const adminSession = request.cookies.get("admin_session")?.value;

    // 2. Define Route Types
    const isAdminRoute = pathname.startsWith("/admin");
    const isAdminLoginPage = pathname === "/admin/login";
    const isUserLoginPage = pathname === "/login" || pathname === "/login-v2";

    // Public paths
    const isPublicPath =
        pathname === "/" || // Landing is public
        pathname.startsWith("/_next") ||
        pathname.startsWith("/static") ||
        pathname.includes(".") ||
        pathname.startsWith("/api/og") ||
        pathname.startsWith("/trip") || // Public shared trips
        pathname.startsWith("/group") || // Public shared groups
        pathname.startsWith("/share") ||
        pathname.startsWith("/reset-password") || // Forgot Password
        pathname === "/release-notes" ||
        pathname === "/help";

    // 3. ADMIN Logic
    if (isAdminRoute) {
        // Allow access to login page
        if (isAdminLoginPage) {
            // If already logged in as admin, go to dashboard
            if (adminSession) {
                return NextResponse.redirect(new URL("/admin", request.url));
            }
            return NextResponse.next();
        }

        // Protect all other /admin routes
        if (!adminSession) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }

        return NextResponse.next();
    }

    // 4. USER Logic (Standard App)
    if (isPublicPath) {
        // Landing page specific: If clicking "Login" button (query param ?login=true), redirect to actual login
        if (pathname === "/" && request.nextUrl.searchParams.get("login") === "true") {
            // If logged in, stay here (dashboard view). If not, go to login.
            if (!userSession) return NextResponse.redirect(new URL("/login-v2", request.url));
        }
        return NextResponse.next();
    }

    // User Login Pages
    if (isUserLoginPage) {
        if (userSession) {
            return NextResponse.redirect(new URL("/", request.url));
        }
        return NextResponse.next();
    }

    // Protect Private User Routes
    if (!userSession) {
        return NextResponse.redirect(new URL("/login-v2", request.url));
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
