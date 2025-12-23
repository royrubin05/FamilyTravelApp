
import { db } from "./src/lib/firebase";

async function checkTripFlights(tripId: string) {
    console.log(`Checking trip: ${tripId}...`);
    const doc = await db.collection("trips").doc(tripId).get();

    if (!doc.exists) {
        console.log("Trip not found.");
        return;
    }

    const data = doc.data();
    console.log("Top-level Travelers:", JSON.stringify(data?.travelers, null, 2));

    if (data?.flights) {
        console.log("Flights Data:");
        data.flights.forEach((f: any, i: number) => {
            console.log(`Flight ${i + 1} (${f.flightNumber}): Travelers`, JSON.stringify(f.travelers, null, 2));
        });
    } else {
        console.log("No flights found.");
    }
}

checkTripFlights("nassau-2025");
