"use server";

import { db as adminDb } from "@/lib/firebase";
import { SystemHealthLog } from "@/lib/system-health";

/**
 * Fetches the specific system health logs for internal components.
 * Returns the last 10 entries.
 */
export async function getSystemHealthLogs(): Promise<SystemHealthLog[]> {
    try {
        const snapshot = await adminDb
            .collection("system_health_logs")
            .orderBy("timestamp", "desc")
            .limit(10)
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString(), // Convert Firestore Timestamp to string for serialization
                job: data.job,
                status: data.status,
                latency: data.latency
            } as SystemHealthLog;
        });
    } catch (error) {
        console.error("Failed to fetch system health logs:", error);
        return [];
    }
}
