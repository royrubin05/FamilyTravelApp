
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        console.error("Service account not found");
        process.exit(1);
    }
}

const db = admin.firestore();

async function check2025() {
    console.log("Fetching users...");
    const usersSnap = await db.collection("users").get();

    for (const userDoc of usersSnap.docs) {
        // console.log(`Checking user: ${userDoc.id}`);
        const tripsSnap = await db.collection("users").doc(userDoc.id).collection("trips").get();

        const trips2025 = tripsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.dates && (t.dates.includes('2025') || t.dates.includes('25')));

        if (trips2025.length > 0) {
            console.log(`\nUser: ${userDoc.id} - Found ${trips2025.length} trips for 2025`);
            trips2025.forEach(t => {
                console.log(`\n  Trip: ${t.destination || t.trip_title_dashboard} (${t.dates})`);
                if (t.flights) {
                    t.flights.forEach((f, i) => {
                        console.log(`    Flight ${i + 1}: ${f.airline} (${f.departure} -> ${f.arrival})`);
                        console.log(`      Duration: "${f.duration}"`);
                        console.log(`      Distance: "${f.distanceMiles}"`);
                    });
                } else {
                    console.log("    No flights recorded.");
                }
            });
        }
    }
}

check2025().catch(console.error);
