import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin (Singleton)
if (admin.apps.length === 0) {
    try {
        let credential = admin.credential.applicationDefault();

        // Local Development: explicitly load service-account.json if env var is set
        // This fixes issues where Next.js doesn't pass the credentials path correctly to the SDK
        if (process.env.NODE_ENV !== 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
            if (fs.existsSync(keyPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                credential = admin.credential.cert(serviceAccount);
                console.log(`[Firebase] Loaded service account from ${keyPath}`);
            }
        }

        admin.initializeApp({
            credential: credential,
            projectId: 'travelapp05'
        });
        console.log("✅ Firebase Admin Initialized");
    } catch (e) {
        console.error("❌ Firebase Admin Init Failed:", e);
    }
}

let db: FirebaseFirestore.Firestore;
let auth: admin.auth.Auth;

try {
    const app = admin.app();
    db = getFirestore(app, 'travelapp05');
    auth = admin.auth(app);
} catch (e) {
    console.error("❌ Failed to bind Admin SDK instances:", e);
    // Explicitly set to 'any' to avoid TS strict null checks blocking the build, 
    // though runtime usage will crash if these are accessed.
    db = null as any;
    auth = null as any;
}

export { db, auth };
export default admin;
