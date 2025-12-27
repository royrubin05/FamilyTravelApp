import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (admin.apps.length === 0) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'travelapp05'
        });
    } catch (e) {
        console.error("Init failed:", e);
    }
}

const db = getFirestore(admin.app(), 'travelapp05');
const auth = admin.auth();

async function main() {
    console.log("Looking for user 'rubin_goldman'...");

    // 1. Find the user
    // We can't query Auth by username efficiently without listUsers loop, 
    // but we can try email if we know it, or just scan first 100 users.
    const listUsersResult = await auth.listUsers(100);
    const user = listUsersResult.users.find(u => {
        const username = u.email?.split('@')[0];
        return username === 'rubin_goldman' || u.displayName === 'Rubin Goldman'; // Adjust if needed
    });

    if (!user) {
        console.log("❌ User 'rubin_goldman' not found in first 100 users.");
        return;
    }

    console.log(`✅ Found user: ${user.email} (${user.uid})`);

    // 2. Query their uploads directly
    console.log(`Fetching uploads for ${user.uid}...`);
    const snapshot = await db.collection("users").doc(user.uid).collection("uploads")
        .get();

    if (snapshot.empty) {
        console.log("No upload logs found for this user.");
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log("---------------------------------------------------");
        console.log(`ID: ${doc.id}`);
        console.log(`Status: ${data.status}`);
        console.log(`File: ${data.fileName}`);
        console.log(`Time: ${data.timestamp}`);
        if (data.error) {
            console.log(`ERROR: ${data.error}`);
        }
        if (data.isTest) {
            console.log("NOTE: This was a TEST run.");
        }
        if (data.debugResponse) {
            console.log("debugResponse snippet:", data.debugResponse.substring(0, 100) + "...");
        }
    });
}

main().catch(console.error);
