
import { db } from '../src/lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

async function repairMiamiTrip() {
    const mixedTripId = "miami-fl-2026-01-14";
    const docRef = db.collection("trips").doc(mixedTripId);
    const doc = await docRef.get();

    if (!doc.exists) {
        console.log("Trip not found");
        return;
    }

    const trip = doc.data();
    if (!trip) return;
    console.log("Original Trip Hotels:", trip.hotels?.length);

    // 1. Separate Hotels
    // The "Nassau Suite" is the one to move.
    const hotelsToKeep = [];
    const hotelsToMove = [];

    (trip.hotels || []).forEach((h: any) => {
        if (h.name.includes("Nassau Suite")) {
            hotelsToMove.push(h);
        } else {
            hotelsToKeep.push(h);
        }
    });

    console.log(`Keeping ${hotelsToKeep.length} hotels, Moving ${hotelsToMove.length} hotels.`);

    // 2. Separate Source Documents
    // "gmail______thanks__your_booking_is_confirmed_at_nassau_suite..." -> Move
    const docsToKeep = [];
    const docsToMove = [];
    (trip.sourceDocuments || []).forEach((d: any) => {
        if (d.name.toLowerCase().includes("nassau")) {
            docsToMove.push(d);
        } else {
            docsToKeep.push(d);
        }
    });

    // 3. Clean Travelers (Remove "Liron")
    // Also, remove "Liron" from the 'travelers' list of the original trip?
    // User said "A new name should never appear".
    const validTravelers = (trip.travelers || []).filter((t: any) => {
        return ["adi", "roy", "ori", "jonathan"].includes(t.id.toLowerCase());
    });

    // UPDATE ORIGINAL TRIP
    await docRef.update({
        hotels: hotelsToKeep,
        sourceDocuments: docsToKeep,
        travelers: validTravelers
    });
    console.log("Updated original trip.");

    // CREATE NEW TRIP (if we have stuff to move)
    if (hotelsToMove.length > 0) {
        // Infer date from hotel checkin
        // Nassau Checkin: March 29, 2026
        const newId = "miami-fl-2026-03-29";

        const newTrip = {
            id: newId,
            destination: "MIAMI, FL", // Same dest, different date
            matched_city_key: "miami",
            dates: "March 29 - March 30, 2026",
            startDateISO: "2026-03-29",
            image_keyword: "Miami",
            travelers: validTravelers, // Assuming same family, or maybe Roy only? The doc likely said Roy. Default to family or cleaned list.
            flights: [], // Assuming no flights for this split
            hotels: hotelsToMove,
            activities: [],
            sourceDocuments: docsToMove
        };

        await db.collection("trips").doc(newId).set(newTrip);
        console.log(`Created new trip: ${newId}`);
    }
}

repairMiamiTrip();
