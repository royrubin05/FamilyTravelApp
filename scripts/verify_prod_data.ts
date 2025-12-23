
import admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function check() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'travelapp05'
        });
    }

    const db = admin.firestore();
    const docId = "desert-hot-springs-ca-2026-01-08";
    const doc = await db.collection("trips").doc(docId).get();

    if (!doc.exists) {
        console.log("Trip not found!");
        return;
    }

    const data = doc.data();
    console.log("--- LIVE FIRESTORE DATA ---");
    console.log("ID:", doc.id);
    console.log("Dates:", data?.dates);
    console.log("AI Summary:", JSON.stringify(data?.ai_summary, null, 2));
    console.log("---------------------------");
}

check();
