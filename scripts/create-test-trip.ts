
import { db as adminDb } from "../src/lib/firebase";
import { v4 as uuidv4 } from 'uuid';

const USER_ID = "SZf0EvzbfGf6kd4wo9jTHI87wzD3"; // rubin_family
const SOURCE_TRIP_ID = "tel-aviv-2026-249711";

async function createTestTrip() {
    console.log("Fetching source trip...");
    const sourceTripRef = adminDb.collection("trips").doc(SOURCE_TRIP_ID);
    const sourceDoc = await sourceTripRef.get();

    if (!sourceDoc.exists) {
        console.error("Source trip not found!");
        return;
    }

    const sourceData = sourceDoc.data();
    if (!sourceData) return;

    const newTripId = `buenos-aires-2006-${uuidv4().slice(0, 8)}`;

    // Modify data
    const newTripData = {
        ...sourceData,
        id: newTripId, // CRITICAL: Overwrite the ID
        destination: "Buenos Aires",
        trip_title_page: "Trip to Buenos Aires",
        trip_title_dashboard: "Trip to Buenos Aires",
        dates: "Jan 1, 2006",
        startDate: "2006-01-01",
        endDate: "2006-01-10",
        status: "upcoming",
        credits: null,
        cancelledAt: null,
        image: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?q=80&w=2940&auto=format&fit=crop",
        flights: [],
        hotels: [],
        activities: [],
        location: "Buenos Aires, Argentina"
    };

    // If there are flights, maybe modify dates? 
    // For now, let's just keep the flights as 'test data' even if dates are wrong, 
    // or we can remove them if the user just wants to test the *trip* mechanism.
    // User said "Maybe grab another trip data just change the data and destiantion just to test."
    // I'll keep the flights but they will look weird with 2006 trip dates. That's fine for a test.

    console.log(`Creating new test trip: ${newTripId}`);

    // Save to global trips collection (if that's where they live? wait, inspect-trip used 'trips' collection)
    // Wait, inspect-trip used `adminDb.collection("trips")`. 
    // dashboard client uses `adminDb.collection("users").doc(USER_ID).collection("trips")`.

    // Let's check where `tel-aviv-2026-249711` actually is.
    // The previous output of `inspect-trip` showed it reading from `adminDb.collection("trips").doc(TRIP_ID)`.
    // BUT `backup-trips` read from `users/USER_ID/trips`.

    // Does the app use a root `trips` collection OR `users/{id}/trips`?
    // Let's re-read `src/lib/tripUtils` or `TripContext` to be sure. 
    // Actually, `TripContext.tsx` usually subscribes to one or the other.
    // And `trip-actions.ts` writes to one.

    // `trip-actions.ts`: 
    // `await db.collection("users").doc(user.uid).collection("trips").doc(id).set(...)`

    // So `inspect-trip.ts` might have been looking at a root collection that is legacy or used for something else?
    // OR `inspect-trip.ts` was just written with `adminDb.collection("trips")` and happened to work if there IS a root collection?
    // Wait, `inspect-trip.ts` output: "Inspecting trip: tel-aviv-2026-249711"... "Flights: [...]"
    // This implies there IS data in `trips/{id}`.

    // However, the `backup-trips.ts` I just wrote used `users/{uid}/trips` and found 15 trips.

    // I should write the new test trip to `users/{uid}/trips` to be safe and visible to the `rubin_family` user.

    await adminDb.collection("users").doc(USER_ID).collection("trips").doc(newTripId).set(newTripData);

    console.log("✅ Test trip created successfully!");
    console.log(`ID: ${newTripId}`);
}

createTestTrip().catch(console.error);
