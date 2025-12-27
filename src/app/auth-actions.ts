"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/firebase";

export async function createSession(idToken: string) {
    try {
        // Verify the ID token first
        const decodedToken = await auth.verifyIdToken(idToken);

        // Create a Session Cookie (expires in 5 days)
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

        // Set the cookie
        (await cookies()).set("session", sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
        });

        console.log(`[Auth] Session created for user: ${decodedToken.uid}`);
        return { success: true };
    } catch (error) {
        console.error("Session creation failed:", error);
        return { success: false, error: "Unauthorized" };
    }
}

export async function logoutSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
    cookieStore.delete("auth_session"); // Clear legacy cookie just in case

    // Optional: Revoke refresh tokens too if we want strict logout
    return { success: true };
}
