
import { db as adminDb } from "../src/lib/firebase";

const USER_ID = "SZf0EvzbfGf6kd4wo9jTHI87wzD3"; // rubin_family

async function listGroups() {
    console.log(`Listing groups for user: ${USER_ID}`);
    const groupsRef = adminDb.collection("users").doc(USER_ID).collection("trip_groups");
    const snapshot = await groupsRef.get();

    if (snapshot.empty) {
        console.log("No groups found.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Group ID: ${doc.id}`);
        console.log(`  Title: ${data.title}`);
        console.log(`  Dates: ${data.startDate} - ${data.endDate}`);
        console.log(`  Trips: ${JSON.stringify(data.ids)}`);
        console.log("---");
    });
}

listGroups().catch(console.error);
