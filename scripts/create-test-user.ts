
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
// Using process.cwd() to resolve service account relative to project root
const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account key not found at:', serviceAccountPath);
    process.exit(1);
}

// Check if already initialized
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
    });
}

const db = admin.firestore();
const auth = admin.auth();

const TEST_USER = {
    email: "test_family@travelroots.internal",
    password: "password123!",
    displayName: "Test Family",
    username: "test_family"
};

async function createTestUser() {
    console.log(`Checking for test user: ${TEST_USER.email}...`);

    try {
        // 1. Check Auth
        let uid;
        try {
            const userRecord = await auth.getUserByEmail(TEST_USER.email);
            console.log(`User exists in Auth (UID: ${userRecord.uid})`);
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log("User not found in Auth. Creating...");
                const newUser = await auth.createUser({
                    email: TEST_USER.email,
                    password: TEST_USER.password,
                    displayName: TEST_USER.displayName
                });
                uid = newUser.uid;
                console.log(`User created (UID: ${uid})`);
            } else {
                throw error;
            }
        }

        // 2. Set Custom Claims (role: user)
        await auth.setCustomUserClaims(uid, { role: 'user' });
        console.log("Set custom claims: { role: 'user' }");

        // 3. Check/Create Firestore Profile
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            console.log("User profile not found in Firestore. Creating...");
            await userDocRef.set({
                username: TEST_USER.username,
                displayName: TEST_USER.displayName,
                role: 'user',
                createdAt: new Date().toISOString(),
                isTestAccount: true
            });
            console.log("Firestore profile created.");
        } else {
            console.log("Firestore profile exists.");
            await userDocRef.update({ isTestAccount: true });
            console.log("Added isTestAccount flag.");
        }


        // 4. Ensure Settings Config Exists (for background image)
        const settingsRef = db.collection('users').doc(uid).collection('settings').doc('config');
        const settingsDoc = await settingsRef.get();
        if (!settingsDoc.exists) {
            console.log("Settings config not found. Creating default settings...");
            await settingsRef.set({
                backgroundImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop",
                familyMembers: [
                    { id: "p1", name: "Ori", role: "Parent" },
                    { id: "p2", name: "Roy", role: "Parent" },
                    { id: "c1", name: "Yoyo", role: "Child" }
                ],
                homeAirport: "SFO"
            });
            console.log("Settings config created.");
        } else {
            console.log("Settings config already exists.");
            // Ensure BG image is set if missing
            if (!settingsDoc.data().backgroundImage) {
                await settingsRef.update({
                    backgroundImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
                });
                console.log("Updated missing background image.");
            }
        }

        console.log("\nSUCCESS: Test user is ready.");
        console.log(`Email: ${TEST_USER.email}`);
        console.log(`UID: ${uid}`);

    } catch (error) {
        console.error("Error creating test user:", error);
        process.exit(1);
    }
}

createTestUser();
