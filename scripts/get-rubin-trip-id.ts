
import { db } from '../src/lib/firebase';

async function getRubinTripId() {
    console.log("Searching for rubin_family trip ID...");
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        // Loose matching
        if (userData.username === 'rubin_family' || userData.email?.includes('rubin')) {
            const tripsSnap = await db.collection("users").doc(userDoc.id).collection("trips").get();
            tripsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.destination === "Las Vegas" || data.hotels?.some((h: any) => h.name.includes("Wynn"))) {
                    console.log(`FOUND_TRIP_ID: ${doc.id}`);
                    console.log(`FOUND_USER_ID: ${userDoc.id}`);
                }
            });
        }
    }
}

getRubinTripId();
