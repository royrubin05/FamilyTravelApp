
import { db as adminDb } from "../src/lib/firebase";
import fs from "fs";
import path from "path";

const USER_ID = "SZf0EvzbfGf6kd4wo9jTHI87wzD3";

async function backupTrips() {
    console.log(`Backing up trips for user: ${USER_ID}`);
    const tripsRef = adminDb.collection("users").doc(USER_ID).collection("trips");
    const snapshot = await tripsRef.get();

    if (snapshot.empty) {
        console.log("No trips found.");
        return;
    }

    const trips: any[] = [];
    snapshot.forEach(doc => {
        trips.push({ id: doc.id, ...doc.data() });
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const filename = path.join(backupDir, `rubin_family_trips_${timestamp}.json`);
    fs.writeFileSync(filename, JSON.stringify(trips, null, 2));

    console.log(`✅ Backup saved to ${filename} (${trips.length} trips)`);
}

backupTrips().catch(console.error);
