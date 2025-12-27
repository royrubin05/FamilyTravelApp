import { NextResponse } from "next/server";
import { db, auth } from "@/lib/firebase";

export const maxDuration = 300; // 5 minutes max

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key !== "temp-backfill-key-123") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch all Root Trips
        const rootSnapshot = await db.collection("trips").get();
        const trips = rootSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 1b. Fetch all Root Groups
        const rootGroupsSnapshot = await db.collection("trip_groups").get();
        const groups = rootGroupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 1c. Fetch Global Settings (Legacy)
        let defaultSettings: any = {
            "backgroundImage": null,
            "familyMembers": []
        };
        const settingsDoc = await db.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
            defaultSettings = settingsDoc.data();
            console.log("Found legacy global settings:", JSON.stringify(defaultSettings));
        } else {
            // Fallback to hardcoded if global settings missing
            defaultSettings = {
                "backgroundImage": "/images/backgrounds/bg-1766165588828.webp",
                "familyMembers": [
                    { "id": "adi", "name": "Adi", "role": "Traveler" },
                    { "id": "roy", "name": "Roy", "role": "Traveler" },
                    { "id": "jonathan", "name": "Jonathan", "role": "Traveler" },
                    { "id": "ori", "name": "Ori", "role": "Traveler" }
                ]
            };
        }

        // 2. Fetch All Users
        const listUsersResult = await auth.listUsers(1000);
        const users = listUsersResult.users;
        const results: any[] = [];
        let totalTripsCopied = 0;
        let totalGroupsCopied = 0;

        // 3. Copy Data to Each User
        for (const user of users) {
            console.log(`Migrating data for user: ${user.email} (${user.uid})`);
            const batch = db.batch();
            let userOpCount = 0;

            // A. Migrate Trips (Only if root has them)
            if (trips.length > 0) {
                for (const trip of trips) {
                    const ref = db.collection("users").doc(user.uid).collection("trips").doc(trip.id);
                    batch.set(ref, trip, { merge: true });
                    userOpCount++;
                    totalTripsCopied++;
                }
            }

            // B. Migrate Groups
            if (groups.length > 0) {
                for (const group of groups) {
                    const ref = db.collection("users").doc(user.uid).collection("groups").doc(group.id);
                    batch.set(ref, group, { merge: true });
                    userOpCount++;
                    totalGroupsCopied++;
                }
            }

            // C. Migrate Settings (Family Members & Background)
            const settingsRef = db.collection("users").doc(user.uid).collection("settings").doc("config");
            batch.set(settingsRef, defaultSettings, { merge: true });
            userOpCount++;

            await batch.commit();
            results.push({
                uid: user.uid,
                email: user.email,
                ops: userOpCount
            });
        }

        return NextResponse.json({
            message: "Full Migration complete",
            totalUsers: users.length,
            totalRootTrips: trips.length,
            totalRootGroups: groups.length,
            totalTripsCopied,
            totalGroupsCopied,
            details: results
        });

    } catch (error: any) {
        console.error("Migration Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
