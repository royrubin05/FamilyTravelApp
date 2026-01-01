import { db as adminDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export interface SystemHealthLog {
    id?: string;
    timestamp: any; // Firestore Timestamp
    job: string;
    status: 'Success' | 'Error';
    latency: number;
}

const COLLECTION_NAME = "system_health_logs";
const MAX_LOGS = 10;

/**
 * Logs a cron execution or system event to Firestore.
 * Maintains a rolling limit of the last 10 entries by deleting older ones.
 */
export async function logCronExecution(
    jobName: string,
    status: 'Success' | 'Error',
    latencyMs: number
) {
    try {
        const collectionRef = adminDb.collection(COLLECTION_NAME);

        // 1. Add the new log entry
        await collectionRef.add({
            timestamp: FieldValue.serverTimestamp(),
            job: jobName,
            status,
            latency: latencyMs,
        });

        // 2. Enforce rolling limit (delete entries older than the massive 10)
        // We fetch the most recent 11+ entries to find which ones to delete
        // Actually, simply fetching all keys sorted by date is fine as this collection is small.
        // But to be safe, let's fetch a reasonable batch.

        const snapshot = await collectionRef
            .orderBy("timestamp", "desc")
            .get();

        if (snapshot.size > MAX_LOGS) {
            const docsToDelete = snapshot.docs.slice(MAX_LOGS);

            const batch = adminDb.batch();
            docsToDelete.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`[SystemHealth] Cleaned up ${docsToDelete.length} old logs.`);
        }

    } catch (error) {
        // Fail silently so we don't break the actual cron job if logging fails
        console.error(`[SystemHealth] Failed to log execution for ${jobName}:`, error);
    }
}
