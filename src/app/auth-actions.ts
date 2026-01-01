"use server";

import { cookies } from "next/headers";
import { auth as adminAuth } from "@/lib/firebase"; // Admin SDK

// 1. Create Independent Admin Session
export async function createAdminSession(idToken: string) {
    try {
        // Verify Token
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Strict Role Check
        if (decodedToken.role !== 'admin' && !decodedToken.admin) { // Check both custom claim formats if any
            return { success: false, error: "Unauthorized: Admins only." };
        }

        // Create Session Cookie
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        // Set 'admin_session' cookie strictly
        (await cookies()).set("admin_session", sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax", // Allows some cross-site nav but secure enough
        });

        return { success: true };

    } catch (error: any) {
        console.error("Create Admin Session Error:", error);
        return { success: false, error: "Authentication failed." };
    }
}


// 2. Create Standard User Session (Replaces old loginAction)
export async function createUserSession(idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        const expiresIn = 60 * 60 * 24 * 14 * 1000; // 2 weeks
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        (await cookies()).set("session", sessionCookie, { // Changed to 'session' to match middleware
            value: sessionCookie,
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/",
            sameSite: "lax",
        });

        return { success: true };

    } catch (error: any) {
        console.error("Create User Session Error:", error);
        return { success: false, error: "Authentication failed." };
    }
}


// 3. Lookup User Email by Username (for login)
export async function lookupUserEmail(username: string) {
    if (!username) return null;
    // Force lowercase normalization for case-insensitive lookup
    const cleanUsername = username.toLowerCase();

    console.log(`[Auth] Lookup request for detected username: "${cleanUsername}"`);
    const { db } = await import("@/lib/firebase");
    try {
        const snapshot = await db.collection("users").where("username", "==", cleanUsername).limit(1).get();
        if (snapshot.empty) {
            console.log(`[Auth] No user found in Firestore for username: "${username}"`);
            return null;
        }

        // Return explicit email if set in Auth (admin update), otherwise default
        // BUT wait: Firestore user doc might NOT have the email field unless we put it there.
        // My previous fix only updated 'email' in Auth, not Firestore.
        // So I need to fetch the Auth user record via Admin SDK to be sure.

        const uid = snapshot.docs[0].id;
        console.log(`[Auth] Found UID: ${uid}. Fetching Auth record...`);

        const userRecord = await adminAuth.getUser(uid);
        console.log(`[Auth] Resolved email: ${userRecord.email}`);
        return userRecord.email;
    } catch (error) {
        console.error("Lookup failed:", error);
        return null;
    }
}

export async function logoutAdmin() {
    (await cookies()).delete("admin_session");
    return { success: true };
}

export async function logoutUser() {
    (await cookies()).delete("session");
    return { success: true };
}

export async function checkSession() {
    const cookieStore = await cookies();
    return !!cookieStore.get("session")?.value;
}
