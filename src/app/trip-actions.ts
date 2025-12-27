"use server";

import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";

import { parseTripDate } from "@/lib/dateUtils";
import { getCurrentUser } from "@/lib/auth-context";

export async function getTrips() {
    // Auth check must be outside try/catch to allow redirect
    const user = await getCurrentUser();

    try {
        const snapshot = await db.collection("users").doc(user.uid).collection("trips").get();
        if (snapshot.empty) return [];

        const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort by Date Ascending
        const sorted = trips.sort((a: any, b: any) => parseTripDate(a.dates) - parseTripDate(b.dates));

        return sanitizeFirestoreData(sorted);
    } catch (error) {
        console.error("Error fetching trips:", error);
        return [];
    }
}

export async function saveTrip(newTrip: any) {
    try {
        const user = await getCurrentUser();
        // 1. Check for Exact ID Match (Update existing)
        const docRef = db.collection("users").doc(user.uid).collection("trips").doc(newTrip.id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            await docRef.set(newTrip, { merge: true });
            revalidatePath("/");
            return { success: true, id: newTrip.id };
        } else {
            console.log(`[Server] Creating new trip: ${newTrip.id}`);
            await docRef.set(newTrip);
            revalidatePath("/");
            return { success: true, id: newTrip.id };
        }
    } catch (error) {
        console.error("Error saving trip:", error);
        return { success: false, error: "Failed to save trip to Firestore" };
    }
}

export async function deleteTripAction(id: string) {
    try {
        const user = await getCurrentUser();
        // 1. Remove from any Trip Groups
        const groupsSnapshot = await db.collection("users").doc(user.uid).collection("groups").where("ids", "array-contains", id).get();

        if (!groupsSnapshot.empty) {
            const batch = db.batch();
            groupsSnapshot.forEach(doc => {
                const groupRef = db.collection("users").doc(user.uid).collection("groups").doc(doc.id);
                const groupData = doc.data();
                const newIds = (groupData.ids || []).filter((tripId: string) => tripId !== id);
                batch.update(groupRef, { ids: newIds, updatedAt: new Date().toISOString() });
            });
            await batch.commit();
            console.log(`[Server] Removed trip ${id} from ${groupsSnapshot.size} groups.`);
        }

        // 2. Delete the Trip
        await db.collection("users").doc(user.uid).collection("trips").doc(id).delete();

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting trip:", error);
        return { success: false, error: "Failed to delete trip" };
    }
}

export async function cancelTripAction(id: string, credits?: Record<string, number>, expirationDate?: string) {
    try {
        const user = await getCurrentUser();
        // Set status to 'cancelled' and save credits/expiration if provided
        await db.collection("users").doc(user.uid).collection("trips").doc(id).set({
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
            credits: credits || null,
            creditExpirationDate: expirationDate || null
        }, { merge: true });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error cancelling trip:", error);
        return { success: false, error: "Failed to cancel trip" };
    }
}

export async function restoreTripAction(id: string) {
    try {
        const user = await getCurrentUser();
        // Remove status (or set to active if we strictly enforce it, but removing works as default is active-ish)
        // Let's set to 'active' to be explicit
        await db.collection("users").doc(user.uid).collection("trips").doc(id).set({
            status: "active",
            cancelledAt: null
        }, { merge: true });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error restoring trip:", error);
        return { success: false, error: "Failed to restore trip" };
    }
}


export async function removeTravelerFromTripAction(tripId: string, travelerToRemove: { id?: string, name: string }) {
    try {
        const user = await getCurrentUser();
        const tripRef = db.collection("users").doc(user.uid).collection("trips").doc(tripId);
        const tripDoc = await tripRef.get();

        if (!tripDoc.exists) {
            return { success: false, error: "Trip not found" };
        }

        const tripData = tripDoc.data();
        const currentTravelers = tripData?.travelers || [];

        // Filter out the traveler
        const updatedTravelers = currentTravelers.filter((t: any) => {
            if (travelerToRemove.id && t.id) {
                return t.id !== travelerToRemove.id;
            }
            // Fallback to name match if IDs are missing or mismatched
            return t.name !== travelerToRemove.name;
        });

        await tripRef.update({ travelers: updatedTravelers });
        revalidatePath("/");

        return { success: true };
    } catch (error) {
        console.error("Error removing traveler:", error);
        return { success: false, error: "Failed to remove traveler" };
    }
}

// --- Trip Group Actions ---

// Helper to sanitize Firestore data (convert timestamps to strings, etc)
function sanitizeFirestoreData(data: any): any {
    if (!data) return data;

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeFirestoreData(item));
    }

    // Handle objects
    if (typeof data === 'object') {
        // Check for Firestore Timestamp (duck typing)
        if (data.toDate && typeof data.toDate === 'function') {
            return data.toDate().toISOString();
        }

        const sanitized: any = {};
        for (const key in data) {
            sanitized[key] = sanitizeFirestoreData(data[key]);
        }
        return sanitized;
    }

    return data;
}

export async function getTripGroups() {
    try {
        const user = await getCurrentUser();
        const snapshot = await db.collection("users").doc(user.uid).collection("groups").get();
        if (snapshot.empty) return [];
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return sanitizeFirestoreData(data);
    } catch (error) {
        console.error("Error fetching trip groups:", error);
        return [];
    }
}

export async function saveTripGroup(group: any) {
    try {
        // Ensure ID
        const groupId = group.id || `group-${Date.now()}`;
        const user = await getCurrentUser();

        await db.collection("users").doc(user.uid).collection("groups").doc(groupId).set({
            ...group,
            id: groupId,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        revalidatePath("/");
        return { success: true, id: groupId };
    } catch (error) {
        console.error("Error saving trip group:", error);
        return { success: false, error: "Failed to save trip group" };
    }
}

export async function reorderTripGroup(groupId: string, newOrderedIds: string[]) {
    try {
        const user = await getCurrentUser();
        await db.collection("users").doc(user.uid).collection("groups").doc(groupId).update({
            ids: newOrderedIds,
            updatedAt: new Date().toISOString()
        });
        revalidatePath("/");
        revalidatePath(`/group/${groupId}`);
        return { success: true };
    } catch (error) {
        console.error("Error reordering group:", error);
        return { success: false, error: "Failed to reorder group" };
    }
}

export async function deleteTripGroupAction(id: string) {
    try {
        const user = await getCurrentUser();
        await db.collection("users").doc(user.uid).collection("groups").doc(id).delete();
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting trip group:", error);
        return { success: false, error: "Failed to delete trip group" };
    }
}

export async function createManualTrip(data: {
    destination: string;
    dates: string;
    activityName?: string;
    travelers?: string[]; // Array of names
}) {
    try {
        // 1. Normalize Destination (Reuse the AI normalization if possible, or just basic trim)
        // For manual entry, we trust the user but basic cleanup is good.
        const cleanDest = data.destination.trim();

        // 2. Generate ID
        // Try to extract year from dates string, else current year.
        let year = new Date().getFullYear();
        const yearMatch = data.dates.match(/\d{4}/);
        if (yearMatch) {
            year = parseInt(yearMatch[0]);
        }

        const idSlug = cleanDest.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const id = `${idSlug}-${year}`;

        // 3. Construct Trip Object
        const newTrip = {
            id,
            destination: cleanDest,
            dates: data.dates,
            // Map activity name to activities array if matched
            activities: data.activityName ? [{
                title: data.activityName,
                description: "Manual Entry"
            }] : [],
            // Map traveler names to objects
            travelers: (data.travelers || []).map(name => ({
                name,
                role: "Adult", // Default
                age: "Adult"   // Default
            })),
            uploadedAt: new Date().toISOString(),
            sourceFileName: "Manual Entry",
            isManual: true
        };

        // 4. Save (Merge)
        console.log(`[Server] Saving Manual Trip: ${id}`);
        // We reuse saveTrip logic or duplicate it. Since we have getCurrentUser logic there, let's just write directly or call saveTrip?
        // Let's write directly to avoid circular dependency if we moved saveTrip. But here createManualTrip is in the SAME file.
        // Wait, saveTrip is exported from this file? Yes.
        // We can just call saveTrip(newTrip).

        await saveTrip(newTrip);

        revalidatePath("/");
        return { success: true, id };

    } catch (error) {
        console.error("Error creating manual trip:", error);
        return { success: false, error: "Failed to create trip." };
    }
}

export interface UploadLog {
    id: string;
    fileName: string;
    gcsUrl: string;
    status: 'success' | 'failed';
    error?: string;
    tripId?: string;
    debugPrompt?: string;
    debugResponse?: string;
    timestamp: string;
    isTest?: boolean;
}

export async function logUploadAttempt(data: Omit<UploadLog, "timestamp">) {
    try {
        const user = await getCurrentUser();
        // Use provided ID or generate one
        const uploadId = data.id || `upload-${Date.now()}`;

        await db.collection("users").doc(user.uid).collection("uploads").doc(uploadId).set({
            ...data,
            id: uploadId,
            timestamp: new Date().toISOString()
        });

        console.log(`[Server] Logged upload attempt: ${uploadId} (${data.status})`);
        return { success: true, id: uploadId };
    } catch (error) {
        console.error("Error logging upload attempt:", error);
        // Don't throw, just return false so we don't break the main flow
        return { success: false, error: "Failed to log upload" };
    }
}
