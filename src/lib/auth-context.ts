import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/firebase"; // Admin SDK

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    const adminCookie = cookieStore.get("admin_session")?.value;

    const token = sessionCookie || adminCookie;

    if (!token) {
        // If no session, redirect to login
        // Note: We might want to make this optional for public routes, but for now this is strict.
        console.log("[Auth] No session cookie found, redirecting to login.");
        redirect("/login-v2");
    }

    try {
        // Verify the session cookie
        const decodedClaims = await auth.verifySessionCookie(token, true);
        return {
            uid: decodedClaims.uid,
            email: decodedClaims.email,
            role: decodedClaims.role || 'user'
        };
    } catch (error) {
        console.warn("Session verify failed (redirecting to clear-session):", error);
        redirect("/api/auth/clear-session");
    }
}
