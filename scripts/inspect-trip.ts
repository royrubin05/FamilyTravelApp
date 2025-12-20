
import { db } from '../src/lib/firebase';

async function inspectTrip() {
    const tripId = "desert-hot-springs-ca-2026-01-08";
    const doc = await db.collection("trips").doc(tripId).get();

    if (doc.exists) {
        console.log("Trip Data:", JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("Trip not found");
    }
}

inspectTrip();
