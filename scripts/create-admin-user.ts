
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

const ADMIN_USER = {
    email: "admin@travelroots.internal",
    password: "password123!", // Initial password, can be changed later
    displayName: "Platform Admin",
    username: "admin"
};

async function createAdminUser() {
    console.log(`Checking for admin user: ${ADMIN_USER.email}...`);

    try {
        // 1. Check Auth
        let uid;
        try {
            const userRecord = await auth.getUserByEmail(ADMIN_USER.email);
            console.log(`User exists in Auth (UID: ${userRecord.uid})`);
            uid = userRecord.uid;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log("User not found in Auth. Creating...");
                const newUser = await auth.createUser({
                    email: ADMIN_USER.email,
                    password: ADMIN_USER.password,
                    displayName: ADMIN_USER.displayName
                });
                uid = newUser.uid;
                console.log(`User created (UID: ${uid})`);
            } else {
                throw error;
            }
        }

        // 2. Set Custom Claims (role: admin)
        await auth.setCustomUserClaims(uid, { role: 'admin' });
        console.log("Set custom claims: { role: 'admin' }");

        // 3. Check/Create Firestore Profile
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            console.log("User profile not found in Firestore. Creating...");
            await userDocRef.set({
                username: ADMIN_USER.username,
                displayName: ADMIN_USER.displayName,
                email: ADMIN_USER.email,
                role: 'admin',
                createdAt: new Date().toISOString(),
                isSystemAdmin: true
            });
            console.log("Firestore profile created.");
        } else {
            console.log("Firestore profile exists.");
            await userDocRef.update({
                role: 'admin',
                isSystemAdmin: true
            });
            console.log("Ensured admin role and flags.");
        }

        console.log("\nSUCCESS: Admin user is ready.");
        console.log(`Email: ${ADMIN_USER.email}`);
        console.log(`Password: ${ADMIN_USER.password}`);
        console.log(`UID: ${uid}`);

    } catch (error) {
        console.error("Error creating admin user:", error);
        process.exit(1);
    }
}

createAdminUser();
