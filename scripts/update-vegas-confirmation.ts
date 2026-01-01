
import { db } from '../src/lib/firebase';

async function updateVegasConfirmation() {
    const userId = "SZf0EvzbfGf6kd4wo9jTHI87wzD3";
    const tripId = "las-vegas--united-states-2025-104197";

    console.log(`Updating trip ${tripId} for user ${userId}...`);

    const tripRef = db.collection("users").doc(userId).collection("trips").doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
        console.error("Trip not found!");
        return;
    }

    const tripData = tripDoc.data();
    const hotels = tripData?.hotels || [];

    if (hotels.length === 0) {
        console.error("No hotels found in this trip.");
        return;
    }

    // Add confirmation to the first hotel (Wynn)
    // We'll just update all hotels for simplicity if there are multiple, but usually 1 per card here
    const updatedHotels = hotels.map((h: any) => {
        if (h.name.includes("Wynn") || hotels.length === 1) {
            return {
                ...h,
                confirmation: "51423512"
            };
        }
        return h;
    });

    await tripRef.update({
        hotels: updatedHotels
    });

    console.log("Successfully updated hotel confirmation code!");
}

updateVegasConfirmation();
