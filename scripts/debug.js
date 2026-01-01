
console.log("Node JS Debug Script Started");
require('dotenv').config({ path: '.env.local' });
try {
    const admin = require('firebase-admin');
    console.log("Firebase Admin required");

    // Check if we can init
    if (!admin.apps.length) {
        console.log("Initializing...");
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'travelapp05'
        });
        console.log("Initialized.");
    }

    const db = admin.firestore();
    console.log("Firestore created, trying fetch...");

    db.collection('system_health_logs').limit(1).get()
        .then(snap => {
            console.log("Fetch success. Docs:", snap.size);
            process.exit(0);
        })
        .catch(err => {
            console.error("Fetch failed:", err);
            process.exit(1);
        });

} catch (e) {
    console.error("Error:", e);
}
