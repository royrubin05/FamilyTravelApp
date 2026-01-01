
import { db } from "../src/lib/firebase";

async function verifyEmailLink(email: string) {
    console.log(`Checking which user has linked email: ${email}`);

    // Collection Group Query
    const snapshot = await db.collectionGroup("settings")
        .where("forwardingEmails", "array-contains", email)
        .get();

    if (snapshot.empty) {
        console.log("❌ No user account found with this linked email.");
        return;
    }

    for (const doc of snapshot.docs) {
        // doc.ref.parent is 'settings', parent.parent is the User doc
        const userDocRef = doc.ref.parent.parent;
        if (userDocRef) {
            const userDoc = await userDocRef.get();
            const userData = userDoc.data();
            console.log(`✅ Found linked user:`);
            console.log(`- User ID: ${userDoc.id}`);
            console.log(`- Username: ${userData?.username}`);
            console.log(`- Display Name: ${userData?.displayName}`);
        }
    }
}

const targetEmail = process.argv[2] || "roy.rubin@gmail.com";
verifyEmailLink(targetEmail).then(() => process.exit());
