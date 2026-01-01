
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found at:', serviceAccountPath);
    process.exit(1);
}

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
    });
}

const db = admin.firestore();

async function checkSettings(email) {
    try {
        const userPool = await admin.auth().getUserByEmail(email);
        const uid = userPool.uid;
        console.log(`Checking settings for user: ${email} (${uid})`);

        const configSnap = await db.collection("users").doc(uid).collection("settings").doc("config").get();
        if (configSnap.exists) {
            console.log("Settings found:", JSON.stringify(configSnap.data(), null, 2));
        } else {
            console.log("No 'config' document found in 'settings' subcollection.");
            // Create default settings if missing
            await db.collection("users").doc(uid).collection("settings").doc("config").set({
                backgroundImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop", // Switzerland lake generic
                familyMembers: [
                    { id: "p1", name: "Ori", role: "Parent" },
                    { id: "p2", name: "Roy", role: "Parent" },
                    { id: "c1", name: "Yoyo", role: "Child" }
                ],
                homeAirport: "SFO"
            }, { merge: true });
            console.log("Created default settings for test user.");
        }

    } catch (error) {
        console.error("Error checking settings:", error);
    }
}

checkSettings("test_family@travelroots.internal");
