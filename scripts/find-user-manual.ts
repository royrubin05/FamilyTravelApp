
import { db } from "../src/lib/firebase";

async function checkAllUsersForEmail(targetEmail: string) {
    console.log(`Scanning all users for linked email: ${targetEmail}...`);

    const usersSnap = await db.collection("users").get();
    let found = false;

    for (const userDoc of usersSnap.docs) {
        const settingsDoc = await userDoc.ref.collection("settings").doc("config").get();
        if (settingsDoc.exists) {
            const data = settingsDoc.data();
            const emails = data?.forwardingEmails || [];
            if (Array.isArray(emails) && emails.includes(targetEmail)) {
                console.log(`✅ MATCH FOUND!`);
                console.log(`- User ID: ${userDoc.id}`);
                console.log(`- Emails: ${emails.join(", ")}`);
                found = true;
            }
        }
    }

    if (!found) {
        console.log(`❌ Email '${targetEmail}' not found in any user settings.`);
        console.log(`Please add it via the App UI > Settings > Linked Emails.`);
    }
}

const email = process.argv[2] || "roy.rubin@gmail.com";
checkAllUsersForEmail(email).then(() => process.exit());
