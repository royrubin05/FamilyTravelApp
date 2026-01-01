
import { auth, db } from "../src/lib/firebase";

async function debugUser(username: string) {
    console.log(`Searching for username: "${username}"`);

    const snapshot = await db.collection("users").where("username", "==", username).get();

    if (snapshot.empty) {
        console.log("❌ No user found with this username in Firestore.");
        return;
    }

    for (const doc of snapshot.docs) {
        console.log(`✅ Found Firestore Doc ID: ${doc.id}`);
        console.log("Firestore Data:", doc.data());

        // Check if auth is initialized
        if (!auth) {
            console.error("❌ Fatal: 'auth' object is null or undefined!");
            return;
        }

        try {
            console.log(`[Debug] Attempting to fetch Auth user for UID: ${doc.id}...`);
            const userRecord = await auth.getUser(doc.id);
            console.log("✅ Auth User Record FOUND:");
            console.log(`- Email: ${userRecord.email}`);
            console.log(`- UID: ${userRecord.uid}`);
            console.log(`- Provider: ${userRecord.providerData.map(p => p.providerId).join(', ')}`);
        } catch (e: any) {
            console.error("❌ Failed to fetch Auth user:", e.code || e.message);
            if (e.code === 'auth/user-not-found') {
                console.error(`CRITICAL: User ${doc.id} exists in Firestore but NOT in Firebase Auth! (Data Ghost)`);
            }
        }
    }
}

const targetUser = (process.argv[2] || "rubin_family").toLowerCase();
debugUser(targetUser);
