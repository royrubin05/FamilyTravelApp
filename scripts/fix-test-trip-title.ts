
import { db as adminDb } from "../src/lib/firebase";

const TRIP_ID = "buenos-aires-2006-6e75dd73";
const USER_ID = "SZf0EvzbfGf6kd4wo9jTHI87wzD3"; // rubin_family

async function fixTripTitle() {
    console.log(`Fixing title for trip: ${TRIP_ID}`);
    const tripRef = adminDb.collection("users").doc(USER_ID).collection("trips").doc(TRIP_ID);

    await tripRef.set({
        destination: "Buenos Aires",
        trip_title_page: "Trip to Buenos Aires",
        trip_title_dashboard: "Trip to Buenos Aires",
        image_keyword: "Buenos Aires",
        ai_summary: {
            human_title: "Trip to Buenos Aires",
            verbose_description: "A test trip to verify cancellation features in Buenos Aires."
        },
        flights: [],
        hotels: [],
        activities: [],
        location: "Buenos Aires, Argentina",
        debugResponse: null // Clear this to avoid confusion
    }, { merge: true });

    console.log("✅ Trip title updated successfully!");
}

fixTripTitle().catch(console.error);
