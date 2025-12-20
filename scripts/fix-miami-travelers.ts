
import { db } from '../src/lib/firebase';

async function fixMiamiTravelers() {
    const tripId = "miami-fl-2026-03-29";
    const docRef = db.collection("trips").doc(tripId);

    // We want ONLY Roy on this trip.
    // Need to get Roy's full object structure or just reconstruct it? 
    // The schema is { id: string, name: string, role: string }

    const roy = {
        id: "roy",
        name: "Roy",
        role: "Traveler"
    };

    try {
        await docRef.update({
            travelers: [roy]
        });
        console.log(`Successfully updated travelers for ${tripId} to just Roy.`);
    } catch (error) {
        console.error("Failed to update trip:", error);
    }
}

fixMiamiTravelers();
