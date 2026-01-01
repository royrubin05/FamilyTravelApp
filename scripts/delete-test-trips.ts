
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found at:', serviceAccountPath);
    process.exit(1);
}

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
        projectId: 'travelapp05'
    });
}

const db = admin.firestore();
const auth = admin.auth();

const TEST_EMAIL = "test_family@travelroots.internal";

async function deleteTestTrips() {
    console.log(`Locating test user: ${TEST_EMAIL}...`);

    try {
        const userRecord = await auth.getUserByEmail(TEST_EMAIL);
        const uid = userRecord.uid;
        console.log(`Found Test User UID: ${uid}`);

        const tripsRef = db.collection('users').doc(uid).collection('trips');
        const tripsSnapshot = await tripsRef.get();

        if (tripsSnapshot.empty) {
            console.log("No trips found to delete.");
            return;
        }

        console.log(`Found ${tripsSnapshot.size} trips. Deleting...`);

        const batch = db.batch();
        tripsSnapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ Successfully deleted ${tripsSnapshot.size} trips.`);

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error("Test user not found. Nothing to delete.");
        } else {
            console.error("Error deleting trips:", error);
            process.exit(1);
        }
    }
}

deleteTestTrips();
