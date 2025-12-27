"use server";

import { auth, db } from "@/lib/firebase";
import { getCurrentUser } from "@/lib/auth-context";
import { revalidatePath } from "next/cache";

export type FamilyUser = {
    uid: string;
    email: string; // "username@travelroots.internal"
    username: string;
    displayName: string;
    createdAt: string;
    lastSignInTime?: string;
    role?: string;
};

export type GlobalTrip = {
    id: string;
    familyUid: string;
    familyName: string;
    familyUsername: string;
    destination: string;
    dates: string;
    status: "AI" | "Manual";
    uploadedAt: string;
    sourceDocument?: string;
    debugPrompt?: string;
    debugResponse?: string;
};

/**
 * List all registered families (users).
 * Secure: Only accessible by Admins.
 */
export async function getFamilies(): Promise<{ success: boolean; data?: FamilyUser[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        // List users from Firebase Auth
        // Note: listUsers() returns max 1000 by default, pagination needed for scale but fine for MVP.
        const listUsersResult = await auth.listUsers(100);

        // Map to friendly format
        const families: FamilyUser[] = listUsersResult.users.map((u) => {
            // Extract username from email
            const username = u.email ? u.email.split('@')[0] : 'unknown';
            return {
                uid: u.uid,
                email: u.email || '',
                username: username,
                displayName: u.displayName || 'No Name',
                createdAt: u.metadata.creationTime,
                lastSignInTime: u.metadata.lastSignInTime,
                role: u.customClaims?.role || 'user'
            };
        });

        return { success: true, data: families };
    } catch (error: any) {
        console.error("Failed to list families:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Admin: Get ALL trips from ALL users.
 */
export async function getAllFamiliesTrips(): Promise<{ success: boolean; data?: GlobalTrip[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        const listUsersResult = await auth.listUsers(1000);
        const users = listUsersResult.users;

        const allTrips: GlobalTrip[] = [];

        // Fetch trips for each user
        // Parallelizing requests
        await Promise.all(users.map(async (u) => {
            const familyName = u.displayName || u.email?.split('@')[0] || 'Unknown';
            const username = u.email?.split('@')[0] || 'unknown';

            const userTripsSnapshot = await db.collection("users").doc(u.uid).collection("trips").get();

            userTripsSnapshot.forEach(doc => {
                const tripData = doc.data();
                allTrips.push({
                    id: doc.id,
                    familyUid: u.uid,
                    familyName: familyName,
                    familyUsername: username,
                    destination: tripData.destination || "Unknown Destination",
                    dates: tripData.dates || "",
                    status: tripData.isManual ? "Manual" : "AI",
                    uploadedAt: tripData.uploadedAt || "",
                    sourceDocument: tripData.sourceDocument,
                    debugPrompt: tripData.debugPrompt,
                    debugResponse: tripData.debugResponse
                });
            });
        }));

        // Sort by upload date desc
        allTrips.sort((a, b) => {
            // Safe date parse
            const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
            const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
            return dateB - dateA;
        });

        return { success: true, data: allTrips };

    } catch (error: any) {
        console.error("Failed to list all trips:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Admin: Delete a trip from any user
 */
export async function adminDeleteTrip(familyUid: string, tripId: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        await db.collection("users").doc(familyUid).collection("trips").doc(tripId).delete();
        revalidatePath("/admin");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete trip:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Create a new Family Account.
 */
export async function createFamily(formData: FormData) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        const username = formData.get("username") as string;
        const displayName = formData.get("displayName") as string;
        const password = formData.get("password") as string;

        if (!username || !password || !displayName) {
            return { success: false, error: "Missing fields" };
        }

        const email = `${username}@travelroots.internal`;

        // 1. Create in Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName,
        });

        // 2. Set Custom Claims
        await auth.setCustomUserClaims(userRecord.uid, { role: 'user' });

        // 3. Create Firestore Profile
        await db.collection('users').doc(userRecord.uid).set({
            username,
            displayName,
            role: 'user',
            createdAt: new Date().toISOString(),
        });

        revalidatePath("/admin/families");
        return { success: true };

    } catch (error: any) {
        console.error("Failed to create family:", error);
        return { success: false, error: error.message };
    }
}
/**
 * Update an existing Family Account.
 */
export async function impersonateUser(formData: FormData) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return { success: false, error: "Unauthorized" };
    }

    const targetUid = formData.get("uid") as string;
    if (!targetUid) {
        return { success: false, error: "Missing Target UID" };
    }

    try {
        const customToken = await auth.createCustomToken(targetUid, {
            role: "impersonation" // Optional: mark session as impersonated
        });

        // Return the token so the client can sign in
        return { success: true, customToken };
    } catch (error: any) {
        console.error("Impersonation error:", error);
        return { success: false, error: error.message };
    }
}

export async function updateFamily(uid: string, data: { displayName?: string, password?: string }) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Update Auth Profile
        const updateData: any = {};
        if (data.displayName) updateData.displayName = data.displayName;
        if (data.password && data.password.trim() !== "") updateData.password = data.password;

        if (Object.keys(updateData).length > 0) {
            await auth.updateUser(uid, updateData);
        }

        // 2. Update Firestore Profile
        if (data.displayName) {
            await db.collection('users').doc(uid).update({
                displayName: data.displayName
            });
        }

        revalidatePath("/admin/families");
        return { success: true };

    } catch (error: any) {
        console.error("Failed to update family:", error);
        return { success: false, error: error.message };
    }
}

// --- Upload Logs & Test Parsing ---

export async function getAllUploadLogs() {
    try {
        const user = await getCurrentUser();
        if (user.role !== "admin") throw new Error("Unauthorized");

        // Collection Group Query
        const snapshot = await db.collectionGroup("uploads")
            .orderBy("timestamp", "desc")
            .limit(50)
            .get();

        const logs = await Promise.all(snapshot.docs.map(async doc => {
            const data = doc.data();
            let userName = "Unknown";

            // Try to get parent user info
            const parentUserRef = doc.ref.parent.parent;
            if (parentUserRef) {
                const userSnap = await parentUserRef.get();
                if (userSnap.exists) {
                    userName = userSnap.data()?.displayName || userSnap.data()?.email || "Unknown";
                }
            }

            return {
                id: doc.id,
                ...data,
                userName
            };
        }));

        return logs;
    } catch (error) {
        console.error("Error fetching upload logs:", error);
        return [];
    }
}

export async function testTripParsing(formData: FormData) {
    try {
        const user = await getCurrentUser();
        if (user.role !== "admin") throw new Error("Unauthorized");

        const file = formData.get("file") as File;
        if (!file) throw new Error("No file uploaded");

        // 1. Upload to GCS
        const { uploadToGCS } = await import("@/lib/gcs");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const uniqueFileName = `TEST-${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
        const gcsPath = `documents/${uniqueFileName}`;
        const publicUrl = await uploadToGCS(buffer, gcsPath, file.type);

        // 2. Parse with Gemini
        const { parseTripWithGemini } = await import("@/lib/GeminiDebug");
        const geminiResult = await parseTripWithGemini(buffer, file.type);

        // Validation Check (Matching Production Logic)
        if (geminiResult.success && geminiResult.tripData) {
            const { parseTripDate } = await import("@/lib/dateUtils");
            // Check Dates
            if (!geminiResult.tripData.dates || typeof geminiResult.tripData.dates !== 'string') {
                throw new Error("Parsing Error: Could not extract valid 'Dates' from the document.");
            }
            const parsedDate = parseTripDate(geminiResult.tripData.dates);
            if (parsedDate === 0) {
                throw new Error(`Validation Error: The extracted date '${geminiResult.tripData.dates}' could not be parsed as a valid date.`);
            }
            // Check Destination
            if (!geminiResult.tripData.destination || typeof geminiResult.tripData.destination !== 'string') {
                throw new Error("Parsing Error: Could not extract a valid 'Destination' from the document.");
            }
        }

        const outputLog = {
            id: `test-${Date.now()}`,
            fileName: file.name,
            gcsUrl: publicUrl,
            status: (geminiResult.success ? 'success' : 'failed') as any,
            tripId: 'TEST-NO-SAVE',
            debugPrompt: geminiResult.debugPrompt || "",
            debugResponse: geminiResult.debugResponse || "",
            isTest: true,
            error: geminiResult.error
        };

        // 3. Log the Test Attempt
        const { logUploadAttempt } = await import("@/app/trip-actions");
        await logUploadAttempt(outputLog);

        return {
            success: geminiResult.success,
            data: geminiResult.tripData,
            debug: {
                prompt: geminiResult.debugPrompt,
                response: geminiResult.debugResponse
            },
            error: geminiResult.error
        };

    } catch (error) {
        console.error("Test parsing failed:", error);
        return { success: false, error: (error as Error).message };
    }
}
