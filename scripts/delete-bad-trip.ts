
import { db as adminDb } from "../src/lib/firebase";

const TRIP_ID = "buenos-aires-2006-6e75dd73";
const USER_ID = "SZf0EvzbfGf6kd4wo9jTHI87wzD3"; // rubin_family

async function deleteBadTrip() {
    console.log(`Deleting bad trip: ${TRIP_ID}`);
    await adminDb.collection("users").doc(USER_ID).collection("trips").doc(TRIP_ID).delete();
    console.log("✅ Trip deleted.");
}

deleteBadTrip().catch(console.error);
