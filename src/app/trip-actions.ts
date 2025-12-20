"use server";

"use server";

import { db } from "@/lib/firebase";
import { revalidatePath } from "next/cache";

export async function getTrips() {
    try {
        const snapshot = await db.collection("trips").get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
        } else {
            // 2. Check for Destination Aggregation (Fuzzy Match)
            // We need to fetch all trips to check this, unfortunately, unless we index destination.
            // Given the scale is small "Family App", fetching all is fine.
            const allTrips = await getTrips();

            const normalize = (s: string) => s?.toLowerCase().trim();
            const match = allTrips.find((t: any) =>
                normalize(t.destination) === normalize(newTrip.destination) ||
                (t.matched_city_key && t.matched_city_key === newTrip.matched_city_key)
            );

            if (match) {
                // MERGE into existing trip
                console.log(`[Server] Merging new data into existing trip: ${match.destination}`);
                const existing = match;

                // Re-implement the merge logic
                const uniqueFlightKey = (f: any) => `${f.confirmation}-${f.flightNumber}-${f.departure}`;
                const uniqueHotelKey = (h: any) => `${h.confirmation}-${h.checkIn}-${h.name}`;
                const uniqueActivityKey = (a: any) => `${a.title}-${a.detail1}-${a.detail2}`;

                const mergedFlights = [
                    ...(existing.flights || []),
                    ...(newTrip.flights || [])
                ].filter((item, index, self) =>
                    index === self.findIndex((t) => uniqueFlightKey(t) === uniqueFlightKey(item))
                );

                const mergedHotels = [
                    ...(existing.hotels || []),
                    ...(newTrip.hotels || [])
                ].filter((item, index, self) =>
                    index === self.findIndex((t) => uniqueHotelKey(t) === uniqueHotelKey(item))
                );

                const mergedActivities = [
                    ...(existing.activities || []),
                    ...(newTrip.activities || [])
                ].filter((item, index, self) =>
                    index === self.findIndex((t) => uniqueActivityKey(t) === uniqueActivityKey(item))
                );

                const existingTravelerIds = new Set((existing.travelers || []).map((t: any) => t.id));
                const newUniqueTravelers = (newTrip.travelers || []).filter((t: any) => !existingTravelerIds.has(t.id));
                const mergedTravelers = [...(existing.travelers || []), ...newUniqueTravelers];

                const mergedTrip = {
                    ...existing,
                    flights: mergedFlights,
                    hotels: mergedHotels,
                    activities: mergedActivities,
                    travelers: mergedTravelers
                };

                await db.collection("trips").doc(existing.id).set(mergedTrip);

            } else {
                // New Trip
                await db.collection("trips").doc(newTrip.id).set(newTrip);
            }
        }

        revalidatePath("/");
        return { success: true };
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
