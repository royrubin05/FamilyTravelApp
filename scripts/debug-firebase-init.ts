
import 'dotenv/config';
import * as admin from 'firebase-admin';

console.log("Script started");

try {
    console.log("Initializing app...");
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'travelapp05'
    });
    console.log("App initialized.");

    const db = admin.firestore();
    console.log("Firestore client created.");

    db.collection('test').get().then(() => {
        console.log("Firestore connection successful!");
        process.exit(0);
    }).catch(e => {
        console.error("Firestore connection failed:", e);
        process.exit(1);
    });

} catch (e) {
    console.error("Initialization error:", e);
}
