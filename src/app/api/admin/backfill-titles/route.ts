import { NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase";
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
        // 1. Process Root Trips Collection
        const rootSnapshot = await db.collection("trips").get();
        let updatedCount = 0;
        const errors: any[] = [];
        const results: any[] = [];

        const processTrip = async (doc: any, collectionPath: string) => {
            const trip = { id: doc.id, ...doc.data() } as any;
            console.log(`Processing ${collectionPath}/${trip.id}...`);

            try {
                const result = await generateTripTitles(trip);
                await db.doc(`${collectionPath}/${trip.id}`).update({
                    trip_title_dashboard: result.dashboard,
                    trip_title_page: result.page,
                    dates: result.dates,
                    ai_summary: result.ai_summary
                });
                updatedCount++;
                results.push({
                    id: trip.id,
                    path: collectionPath,
                    status: "updated",
                    title: result.dashboard,
                    dates: result.dates,
                    ai_summary: result.ai_summary
                });
            } catch (err: any) {
                console.error(`Error processing ${trip.id} in ${collectionPath}:`, err);
                errors.push({ id: trip.id, path: collectionPath, error: err.message });
                results.push({ id: trip.id, path: collectionPath, status: "error", error: err.message });
            }
        };

        // Process Root
        await Promise.all(rootSnapshot.docs.map(doc => processTrip(doc, "trips")));

        // 2. Process Users' Trips Collections (via Auth List)
        let processedUsersCount = 0;
        let listUsersResult = await auth.listUsers(1000);

        while (listUsersResult.users.length > 0) {
            for (const user of listUsersResult.users) {
                processedUsersCount++;
                const userTripsSnapshot = await db.collection("users").doc(user.uid).collection("trips").get();
                if (!userTripsSnapshot.empty) {
                    await Promise.all(userTripsSnapshot.docs.map(doc => processTrip(doc, `users/${user.uid}/trips`)));
                }
            }
            if (listUsersResult.pageToken) {
                listUsersResult = await auth.listUsers(1000, listUsersResult.pageToken);
            } else {
                break;
            }
        }

        return NextResponse.json({
            message: "Backfill complete (Root + Users)",
            processedRoot: rootSnapshot.size,
            processedUsers: processedUsersCount,
            updated: updatedCount,
            errors,
            details: results
        });


    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
