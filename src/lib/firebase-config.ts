import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (Singleton)
let app: any;
let auth: any;

try {
    // Check if critical keys are present
    if (!firebaseConfig.apiKey) {
        console.warn("⚠️ Firebase Config: Missing apiKey. Auth will not work.");
    }

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
} catch (error) {
    console.error("❌ Firebase Client Init Failed:", error);
}

// Initialize Firestore
import { getFirestore } from "firebase/firestore";
const db = app ? getFirestore(app) : undefined;

export { app, auth, db };
