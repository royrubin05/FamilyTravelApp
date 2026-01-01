
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
        credential: admin.credential.cert(require(serviceAccountPath))
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function promoteUser(email: string) {
    try {
        const user = await auth.getUserByEmail(email);
        await auth.setCustomUserClaims(user.uid, { role: 'admin' });

        // Also update Firestore for consistency (optional but good for UI)
        await db.collection('users').doc(user.uid).update({ role: 'admin' });

        console.log(`✅ Successfully promoted ${email} to ADMIN.`);
        console.log(`UID: ${user.uid}`);
        console.log("Note: The user must log out and log back in for the token to refresh.");

    } catch (error: any) {
        console.error(`Error promoting user ${email}:`, error.message);
    }
}

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.log("Usage: npx ts-node scripts/promote-user.ts <email>");
    process.exit(1);
}

promoteUser(targetEmail);
