
import { auth } from "../src/lib/firebase"; // Admin SDK

async function listUsers() {
    try {
        console.log("Fetching users...");
        const listUsersResult = await auth.listUsers(10);

        if (listUsersResult.users.length === 0) {
            console.log("No users found in Firebase Auth.");
            return;
        }

        console.log("Existing Users:");
        listUsersResult.users.forEach((userRecord) => {
            console.log(`- ${userRecord.email} (UID: ${userRecord.uid})`);
        });
    } catch (error) {
        console.error("Error listing users:", error);
    }
}

listUsers();
