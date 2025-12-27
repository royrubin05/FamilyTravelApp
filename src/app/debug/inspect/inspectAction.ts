"use server";
import { db } from "@/lib/firebase";

export async function inspect2025Data() {
    const logs = [];
    logs.push("Fetching users...");

    if (!db) return ["Error: Database not initialized"];

    try {
        const usersSnap = await db.collection("users").get();

        for (const userDoc of usersSnap.docs) {
            const tripsSnap = await db.collection("users").doc(userDoc.id).collection("trips").get();
            const trips = tripsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Loose 2025 check
            const trips2025 = trips.filter((t: any) =>
                t.dates && (t.dates.includes('2025') || t.dates.includes('25'))
            );

            if (trips2025.length > 0) {
                logs.push(`User: ${userDoc.id}: Found ${trips2025.length} trips.`);

                trips2025.forEach((t: any) => {
                    logs.push(`--- Trip: ${t.destination} (${t.dates}) ---`);
                    if (t.flights?.length) {
                        t.flights.forEach((f: any, i: number) => {
                            logs.push(`   Flight ${i + 1}: ${f.airline} ${f.flightNumber} (${f.departure} -> ${f.arrival}) | ${f.duration} | ${f.distanceMiles} mi`);
                        });
                    } else {
                        logs.push("   No flights.");
                    }
                });
            }
        }
    } catch (e: any) {
        logs.push(`Error: ${e.message}`);
    }
    return logs;
}
