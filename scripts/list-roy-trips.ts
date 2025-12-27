
import { db as adminDb } from "../src/lib/firebase";

const USER_ID = "T1OvhjQOk3Ua8Eu1JaH3L1qlc5z2"; // roy.rubin@gmail.com

async function listRoyTrips() {
    console.log(`Listing trips for user: ${USER_ID}`);
    const tripsRef = adminDb.collection("users").doc(USER_ID).collection("trips");
    const snapshot = await tripsRef.get();

    if (snapshot.empty) {
        console.log("No trips found for Roy.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  Destination: ${data.destination}`);
        console.log(`  Dates: "${data.dates}"`);
        console.log("---");
    });
}

listRoyTrips().catch(console.error);
