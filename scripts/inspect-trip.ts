
import { db as adminDb } from "../src/lib/firebase";

const TRIP_ID = "buenos-aires-2006-6e75dd73";
const USER_ID = "SZf0EvzbfGf6kd4wo9jTHI87wzD3";

async function inspectTrip() {
    console.log(`Inspecting trip: ${TRIP_ID} for user ${USER_ID}`);
    const doc = await adminDb.collection("users").doc(USER_ID).collection("trips").doc(TRIP_ID).get();

    if (doc.exists) {
        console.log(JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("Trip not found");
    }
}

inspectTrip().catch(console.error);
