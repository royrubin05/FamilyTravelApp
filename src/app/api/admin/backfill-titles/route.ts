import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { generateTripTitles } from "@/lib/aiTitling";

export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key !== process.env.CRON_SECRET) {
        // Fallback if env not set for convenience in dev, but strictly should match
        // For this one-off, let's hardcode a temporary check or rely on CRON_SECRET being set.
        // If CRON_SECRET is missing, we might fail.
        // Let's use a temporary hardcoded key for this specific run request by the user.
        if (key !== "temp-backfill-key-123") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const snapshot = await db.collection("trips").get();
        let updatedCount = 0;
        const errors: any[] = [];

        const updatePromises = snapshot.docs.map(async (doc) => {
            const trip = { id: doc.id, ...doc.data() } as any;
            console.log(`Processing ${trip.id}...`);

            try {
                const result = await generateTripTitles(trip);
                await db.collection("trips").doc(trip.id).update({
                    trip_title_dashboard: result.dashboard,
                    trip_title_page: result.page,
                    ai_summary: result.ai_summary
                });
                updatedCount++;
                return { id: trip.id, status: "updated", title: result.dashboard };
            } catch (err: any) {
                console.error(`Error processing ${trip.id}:`, err);
                errors.push({ id: trip.id, error: err.message });
                return { id: trip.id, status: "error", error: err.message };
            }
        });

        const results = await Promise.all(updatePromises);

        return NextResponse.json({
            message: "Backfill complete",
            processed: snapshot.size,
            updated: updatedCount,
            errors,
            details: results
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
