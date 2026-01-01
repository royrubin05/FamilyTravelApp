
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

// Usage: npx tsx scripts/reset-password.ts <UID> <NEW_PASSWORD>
const args = process.argv.slice(2);
const targetUid = args[0] || "SZf0EvzbfGf6kd4wo9jTHI87wzD3"; // Default to rubin_family if not provided
const targetPassword = args[1] || "123123";

resetPassword(targetUid, targetPassword);
