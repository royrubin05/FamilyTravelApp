import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

console.log("Checking credentials environment variable...");
console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

// Simulate the logic in src/lib/firebase.ts
if (admin.apps.length === 0) {
    try {
        console.log("Attempting to initialize app...");
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'travelapp05'
        });
        console.log("✅ Initialization successful");
    } catch (e) {
        console.error("❌ Initialization failed:", e);
    }
}

if (admin.apps.length > 0) {
    try {
        const app = admin.app();
        console.log("App Name:", app.name);
        // Try to get Firestore
        const db = getFirestore(app, 'travelapp05');
        console.log("Firestore instance obtained.");

        // Try a read to verify connection
        db.collection('users').limit(1).get().then(() => {
            console.log("✅ Firestore Read Success");
        }).catch(e => {
            console.error("❌ Firestore Read Failed:", e);
        });

    } catch (e) {
        console.error("❌ Failed to bind services:", e);
    }
} else {
    console.error("❌ No admin app initialized. Apps length is 0.");
}
