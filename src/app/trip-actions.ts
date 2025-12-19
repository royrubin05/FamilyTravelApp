"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

const TRIPS_FILE = path.join(process.cwd(), "src/data/trips.json");

export async function getTrips() {
    try {
        if (!fs.existsSync(TRIPS_FILE)) {
            return []; // Should verify if we want to fallback to static or create empty
        }
        const data = fs.readFileSync(TRIPS_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading trips.json:", error);
        return [];
    }
}

export async function saveTrip(newTrip: any) {
    try {
        const trips = await getTrips();

        // 1. Check for Exact ID Match (Update existing)
        const existingIdIndex = trips.findIndex((t: any) => t.id === newTrip.id);
        if (existingIdIndex >= 0) {
            // Merge logic for ID match could go here, but usually ID match means "Edit"
            // For now, let's assume if IDs match, we overwrite or we are updating the same trip object
            trips[existingIdIndex] = { ...trips[existingIdIndex], ...newTrip };
        } else {
            // 2. Check for Destination Aggregation (Fuzzy Match)
            // If destination same, merge into it
            const normalize = (s: string) => s?.toLowerCase().trim();
            const matchIndex = trips.findIndex((t: any) =>
                normalize(t.destination) === normalize(newTrip.destination) ||
                (t.matched_city_key && t.matched_city_key === newTrip.matched_city_key)
            );

            if (matchIndex >= 0) {
                // MERGE into existing trip
                console.log(`[Server] Merging new data into existing trip: ${trips[matchIndex].destination}`);
                const existing = trips[matchIndex];

                // Merge Arrays with unique keys composite
                const uniqueFlightKey = (f: any) => `${f.confirmation}-${f.flightNumber}-${f.departure}`;
                const uniqueHotelKey = (h: any) => `${h.confirmation}-${h.checkIn}-${h.name}`;
                const uniqueActivityKey = (a: any) => `${a.title}-${a.detail1}-${a.detail2}`; // distinct enough?

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

                // Merge Travelers (Unique by ID)
                const existingTravelerIds = new Set((existing.travelers || []).map((t: any) => t.id));
                const newUniqueTravelers = (newTrip.travelers || []).filter((t: any) => !existingTravelerIds.has(t.id));
                const mergedTravelers = [...(existing.travelers || []), ...newUniqueTravelers];

                trips[matchIndex] = {
                    ...existing,
                    flights: mergedFlights,
                    hotels: mergedHotels,
                    activities: mergedActivities,
                    travelers: mergedTravelers,
                    // Optionally update dates if existing is vague?
                    // For now, keep existing metadata (ID, Image) to preserve manual edits
                };

            } else {
                // New Trip
                trips.unshift(newTrip);
            }
        }

        fs.writeFileSync(TRIPS_FILE, JSON.stringify(trips, null, 2));
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error saving trip:", error);
        return { success: false, error: "Failed to save trip to disk" };
    }
}

export async function deleteTripAction(id: string) {
    try {
        const trips = await getTrips();
        const filtered = trips.filter((t: any) => t.id !== id);
        fs.writeFileSync(TRIPS_FILE, JSON.stringify(filtered, null, 2));
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error deleting trip:", error);
        return { success: false, error: "Failed to delete trip" };
    }
}
