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
        const listUsersResult = await auth.listUsers(100);

        // Fetch Firestore profiles in parallel to get real usernames
        // because Auth email might not match the internal username anymore
        const firestoreDocs = await Promise.all(
            listUsersResult.users.map(u => db.collection("users").doc(u.uid).get())
        );
        const firestoreMap = new Map();
        firestoreDocs.forEach(doc => {
            if (doc.exists) {
                firestoreMap.set(doc.id, doc.data());
            }
        });

        // Map to friendly format
        const families: FamilyUser[] = listUsersResult.users.map((u) => {
            const firestoreData = firestoreMap.get(u.uid);

            // Prefer Firestore username, fallback to email guess if missing (legacy/broken state)
            const realUsername = firestoreData?.username || (u.email ? u.email.split('@')[0] : 'unknown');

            return {
                uid: u.uid,
                email: u.email || '',
                username: realUsername,
                displayName: firestoreData?.displayName || u.displayName || 'No Name',
                createdAt: u.metadata.creationTime,
                lastSignInTime: u.metadata.lastSignInTime,
                role: u.customClaims?.role || 'user'
            };
        });

        return { success: true, data: families };
    } catch (error: any) {
        if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
        console.error("Failed to list families:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Admin: Get ALL trips from ALL users.
 */
/**
 * Admin: Get ALL trips from ALL users.
 * Uses collectionGroup to ensure we catch trips even if the parent user is missing from Auth.
 */
export async function getAllFamiliesTrips(): Promise<{ success: boolean; data?: GlobalTrip[]; error?: string }> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Fetch ALL trips via Collection Group
        const tripsSnapshot = await db.collectionGroup("trips").get();

        if (tripsSnapshot.empty) {
            return { success: true, data: [] };
        }

        // 2. Identify unique Family UIDs to fetch profiles efficiently
        const familyUids = new Set<string>();
        tripsSnapshot.docs.forEach(doc => {
            // Path: users/{uid}/trips/{tripId}
            // parent = trips, parent.parent = users/{uid}
            const parentRef = doc.ref.parent.parent;
            if (parentRef) {
                familyUids.add(parentRef.id);
            }
        });

        // 3. Fetch all relevant User Profiles in parallel
        const userProfiles = new Map<string, { displayName: string, username: string }>();
        const uidsArray = Array.from(familyUids);

        // Batch fetch logic (though Firestore SDK doesn't have getAll for IDs, so Promise.all get)
        await Promise.all(uidsArray.map(async (uid) => {
            try {
                const userDoc = await db.collection("users").doc(uid).get();
                if (userDoc.exists) {
                    const d = userDoc.data();
                    userProfiles.set(uid, {
                        displayName: d?.displayName || "Unknown Family",
                        username: d?.username || "unknown"
                    });
                } else {
                    userProfiles.set(uid, { displayName: "Orphaned Trip", username: uid });
                }
            } catch (e) {
                console.error(`Failed to fetch profile for ${uid}`, e);
                userProfiles.set(uid, { displayName: "Error Fetching User", username: uid });
            }
        }));

        // 4. Map trips
        const allTrips: GlobalTrip[] = tripsSnapshot.docs.map(doc => {
            const tripData = doc.data();
            const familyUid = doc.ref.parent.parent?.id || "unknown";
            const profile = userProfiles.get(familyUid) || { displayName: "Unknown", username: "unknown" };

            return {
                id: doc.id,
                familyUid: familyUid,
                familyName: profile.displayName,
                familyUsername: profile.username,
                destination: tripData.destination || "Unknown Destination",
                dates: tripData.dates || "",
                status: tripData.isManual ? "Manual" : "AI",
                uploadedAt: tripData.uploadedAt || "",
                sourceDocument: tripData.sourceDocument,
                debugPrompt: tripData.debugPrompt,
                debugResponse: tripData.debugResponse
            };
        });

        // 5. Sort by upload date desc
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
        const customEmail = formData.get("email") as string; // Optional custom email

        if (!username || !password || !displayName) {
            return { success: false, error: "Missing fields" };
        }

        // Use custom email if provided, otherwise default to internal pattern
        const email = (customEmail && customEmail.trim() !== "")
            ? customEmail.trim()
            : `${username}@travelroots.internal`;

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

export async function updateFamily(uid: string, data: { displayName?: string, password?: string, email?: string }) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Update Auth Profile
        const updateData: any = {};
        if (data.displayName) updateData.displayName = data.displayName;
        if (data.password && data.password.trim() !== "") updateData.password = data.password;
        if (data.email && data.email.trim() !== "") updateData.email = data.email.trim();

        if (Object.keys(updateData).length > 0) {
            await auth.updateUser(uid, updateData);
        }

        // 2. Update Firestore Profile
        if (data.displayName) {
            await db.collection('users').doc(uid).set({
                displayName: data.displayName
            }, { merge: true });
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

// --- Quarantine Actions ---

/**
 * List quarantined emails.
 */
export async function getQuarantinedEmails(limitCount: number = 50) {
    try {
        const user = await getCurrentUser();
        if (user.role !== "admin") throw new Error("Unauthorized");

        const snapshot = await db.collection("admin_quarantine")
            .orderBy("receivedAt", "desc")
            .limit(limitCount)
            .get();

        const emails = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return { success: true, data: emails };
    } catch (error) {
        console.error("Error fetching quarantined emails:", error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Get details of a single quarantined email.
 */
export async function getQuarantinedEmailDetails(id: string) {
    try {
        const user = await getCurrentUser();
        if (user.role !== "admin") throw new Error("Unauthorized");

        const doc = await db.collection("admin_quarantine").doc(id).get();
        if (!doc.exists) return { success: false, error: "Not Found" };

        return {
            success: true,
            data: {
                id: doc.id,
                ...doc.data()
            } as any
        };
    } catch (error) {
        console.error("Error fetching quarantined email details:", error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Force parse a quarantined email despite validation failure.
 */
export async function forceParseQuarantinedEmail(id: string) {
    try {
        const user = await getCurrentUser();
        if (user.role !== "admin") throw new Error("Unauthorized");

        // 1. Fetch from quarantine
        const docRef = db.collection("admin_quarantine").doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) throw new Error("Quarantined email not found");

        const data = docSnap.data();
        if (!data || !data.rawPayload) throw new Error("Invalid quarantine data");

        // 2. Inject into processing pipeline with bypass flag
        const { EmailIngestionService } = await import("@/lib/emailService");

        const payload = {
            ...data.rawPayload,
            bypassValidation: true // CRITICAL: Bypass the validation check
        };

        const result = await EmailIngestionService._processCore(payload);

        if (result.success) {
            // 3. Update status to IMPORTED
            await docRef.update({
                status: "FORCED_IMPORT",
                tripId: result.tripId,
                forcedAt: new Date().toISOString(),
                forcedBy: user.uid
            });
            revalidatePath("/admin/quarantine");
            return { success: true, tripId: result.tripId };
        } else {
            throw new Error(result.error || "Parsing failed");
        }

    } catch (error) {
        console.error("Force Parse Error:", error);
        return { success: false, error: (error as Error).message };
    }
}
