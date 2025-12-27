
import 'dotenv/config'; // Load env vars
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Handle potential ESM/CJS default import mismatch
const firebaseAdmin = admin.apps ? admin : (admin as any).default;

// Initialize Admin SDK standalone (outside Next.js context)
if (!firebaseAdmin.apps.length) {
    try {
        console.log("Initializing Firebase Admin with project: travelapp05");
        // Try standard application default credentials (ADC)
        // Ensure you have run: gcloud auth application-default login
        firebaseAdmin.initializeApp({
            projectId: 'travelapp05',
            credential: firebaseAdmin.credential.applicationDefault()
        });
    } catch (e) {
        console.error("Failed to initialize Firebase Admin:", e);
    }
}

const auth = getAuth();
// Use the named database 'travelapp05' as per src/lib/firebase.ts
const db = getFirestore(firebaseAdmin.app(), 'travelapp05');

const TARGET_USERNAME = "rubin_family";
const TARGET_DISPLAY_NAME = "The Rubins";
const TARGET_PASSWORD = "123456"; // Temporary, change on first login
const FAKE_EMAIL = `${TARGET_USERNAME}@travelroots.internal`;

async function bootstrap() {
    console.log(`🚀 Bootstrapping Admin User: ${TARGET_USERNAME}...`);

    try {
        // 1. Create Auth User
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(FAKE_EMAIL);
            console.log(`✅ User ${FAKE_EMAIL} already exists in Auth.`);
            // Force Update Password to ensure it matches
            await auth.updateUser(userRecord.uid, {
                password: TARGET_PASSWORD
            });
            console.log(`✅ Password force-updated to: ${TARGET_PASSWORD}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log(`Creating new user...`);
                userRecord = await auth.createUser({
                    email: FAKE_EMAIL,
                    password: TARGET_PASSWORD,
                    displayName: TARGET_DISPLAY_NAME,
                });
                console.log(`✅ Created Auth User: ${userRecord.uid}`);
            } else {
                throw error;
            }
        }

        if (!userRecord) throw new Error("User Record undefined");

        // 2. Create/Update User Document in Firestore
        // Path: users/{uid}
        const userRef = db.collection('users').doc(userRecord.uid);
        console.log(`Updating Firestore document: users/${userRecord.uid}`);

        await userRef.set({
            username: TARGET_USERNAME,
            displayName: TARGET_DISPLAY_NAME,
            role: 'admin',
            createdAt: new Date().toISOString(),
            recoveryEmail: 'roy.rubin@gmail.com' // Hardcoded for safety
        }, { merge: true });

        console.log(`✅ User Document provisioned at: users/${userRecord.uid}`);

        // 3. Set Custom Claims (Optional but good practice)
        await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
        console.log(`✅ Admin Claims set.`);

        console.log(`\n🎉 Success! You can now log in with:`);
        console.log(`Username: ${TARGET_USERNAME}`);
        console.log(`Password: ${TARGET_PASSWORD}`);

    } catch (error) {
        console.error("❌ Bootstrap failed:", error);
    }
}

bootstrap();
