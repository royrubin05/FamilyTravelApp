"use server";

"use server";

import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";

import { parseTripDate } from "@/lib/dateUtils";

export async function getTrips() {
    try {
        const snapshot = await db.collection("trips").get();
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
        // 1. Check for Exact ID Match (Update existing)
        const docRef = db.collection("trips").doc(newTrip.id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            // Overwrite or Deep Merge?
            // The JSON logic was "overwrite properties if array element matches, else append"
            // Since we are moving to DB, let's keep it simple: Overwrite the doc with merged fields if necessary. 
            // Actually, the previous logic did "Array Merging". Let's preserve that if possible or simplify.
            // For simplicity and robustness given the switch to DB:
            // Just update the doc. If complex merging matches are needed, read -> merge -> set.

            // NOTE: The previous logic also checked for "Destination Aggregation / Fuzzy Match" which changes the ID!
            // That is complex to port 1:1 without scanning all trips.
            // Let's implement the fuzzy match scan.

            await docRef.set(newTrip, { merge: true });
            revalidatePath("/");
            return { success: true, id: newTrip.id };
        } else {
            // 2. Create New Trip
            // We removed the fuzzy matching based on destination name because it was causing incorrect merges (e.g. different dates).
            // The AI now handles the merging decision by returning the existing ID if it detects a match with dates.
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
        // 1. Remove from any Trip Groups
        const groupsSnapshot = await db.collection("trip_groups").where("ids", "array-contains", id).get();

        if (!groupsSnapshot.empty) {
            const batch = db.batch();
            groupsSnapshot.forEach(doc => {
                const groupRef = db.collection("trip_groups").doc(doc.id);
                // We manually filter to be safe, or use FieldValue.arrayRemove if we imported it.
                // Since we don't have FieldValue imported from admin easily here without checking imports,
                // let's just read-modify-write or assume we can filter. 
                // Actually, let's use the current data since we have the snapshot.
                const groupData = doc.data();
                const newIds = (groupData.ids || []).filter((tripId: string) => tripId !== id);
                batch.update(groupRef, { ids: newIds, updatedAt: new Date().toISOString() });
            });
            await batch.commit();
            console.log(`[Server] Removed trip ${id} from ${groupsSnapshot.size} groups.`);
        }

        // 2. Delete the Trip
        await db.collection("trips").doc(id).delete();

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting trip:", error);
        return { success: false, error: "Failed to delete trip" };
    }
}


export async function removeTravelerFromTripAction(tripId: string, travelerToRemove: { id?: string, name: string }) {
    try {
        const tripRef = db.collection("trips").doc(tripId);
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
        const snapshot = await db.collection("trip_groups").get();
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

        await db.collection("trip_groups").doc(groupId).set({
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
        await db.collection("trip_groups").doc(groupId).update({
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
        await db.collection("trip_groups").doc(id).delete();
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
        await db.collection("trips").doc(id).set(newTrip, { merge: true });

        revalidatePath("/");
        return { success: true, id };

    } catch (error) {
        console.error("Error creating manual trip:", error);
        return { success: false, error: "Failed to create trip." };
    }
}
