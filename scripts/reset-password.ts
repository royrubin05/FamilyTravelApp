
import { auth } from "../src/lib/firebase"; // Admin SDK

async function resetPassword(uid: string, newPassword: string) {
    try {
        console.log(`Resetting password for UID: ${uid}...`);
        await auth.updateUser(uid, {
            password: newPassword
        });
        console.log(`✅ Password updated to: ${newPassword}`);
    } catch (error) {
        console.error("Error updating password:", error);
    }
}

// UID for rubin_family from previous list-users output: SZf0EvzbfGf6kd4wo9jTHI87wzD3
resetPassword("SZf0EvzbfGf6kd4wo9jTHI87wzD3", "123123");
