
import { db } from '../src/lib/firebase';

async function findRubinTrip() {
    console.log("Searching for users...");
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Check if username matches or something similar
        if (userData.username === 'rubin_family' || userData.email?.includes('rubin')) {
            console.log(`Found User: ${userId} (${userData.username || userData.email})`);

            const tripsSnap = await db.collection("users").doc(userId).collection("trips").get();
            console.log(`User has ${tripsSnap.size} trips.`);

            // Find trips with hotels
            const tripsWithHotels = tripsSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((t: any) => t.hotels && t.hotels.length > 0);

            console.log(`Found ${tripsWithHotels.length} trips with hotels.`);

            // Sort by creation or date to find "latest"
            // Assuming 'uploadedAt' or 'createdAt' or parsing dates
            tripsWithHotels.sort((a: any, b: any) => {
                const dateA = a.uploadedAt || a.createdAt || "0";
                const dateB = b.uploadedAt || b.createdAt || "0";
                return dateB.localeCompare(dateA); // Descending
            });

            if (tripsWithHotels.length > 0) {
                const latest = tripsWithHotels[0];
                console.log("Latest Trip with Hotel:");
                console.log(JSON.stringify(latest, null, 2));
            }
        }
    }
}

findRubinTrip();
