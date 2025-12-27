
import { db } from '../src/lib/firebase';

async function triggerError() {
    console.log("Attempting to query collectionGroup('trips') by shareToken...");
    try {
        await db.collectionGroup('trips').where('shareToken', '==', 'dummy-token').get();
        console.log("Success? (Unexpected if index is missing)");
    } catch (error: any) {
        console.log("CAUGHT ERROR (Trips):");
        console.log(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        // Also try to access basic properties directly in case stringify misses them
        console.log("Message:", error.message);
        console.log("Details:", error.details);
    }

    console.log("\nAttempting to query collectionGroup('groups') by shareToken...");
    try {
        await db.collectionGroup('groups').where('shareToken', '==', 'dummy-token').get();
        console.log("Success? (Unexpected if index is missing)");
    } catch (error: any) {
        console.log("CAUGHT ERROR (Groups):");
        console.log(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
    process.exit(0);
}

triggerError();
