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

        return sorted;
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
        await db.collection("trips").doc(id).delete();
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting trip:", error);
        return { success: false, error: "Failed to delete trip" };
    }
}
