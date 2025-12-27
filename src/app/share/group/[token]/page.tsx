import { getPublicEntity } from "@/app/public-share-actions";
import GroupContent from "@/components/group/GroupContent";
import { getCityImages } from "@/app/image-actions";
import { getTrips } from "@/app/trip-actions"; // We need trips to filter
import { AccessRestricted } from "@/components/sharing/AccessRestricted";
import { notFound } from "next/navigation";
import { TripGroup } from "@/types/trip";

// Dynamic rendering
export const dynamic = 'force-dynamic';

interface PublicGroupPageProps {
    params: Promise<{ token: string }>;
}

export default async function PublicGroupPage({ params }: PublicGroupPageProps) {
    const { token } = await params;
    const result = await getPublicEntity("group", token);

    if (!result) {
        notFound();
    }

    if ((result as any).error === "ACCESS_RESTRICTED") {
        return <AccessRestricted />;
    }

    const group = result as TripGroup;

    // Fetch all trips (server side check needed?)
    // In strict architecture, we should only fetch PUBLIC data. 
    // `getTrips` fetches ALL trips for the user usually.
    // However, `getTrips` uses `getCurrentUser()`.
    // In public route, `getCurrentUser()` might fail or return null.
    // We need a helper to fetch specific trips by ID *without* auth check IF we are in this public context.

    // Actually, `getPublicEntity` for GROUP gives us the Group Object.
    // The group object has `ids` (list of trip IDs).
    // The trips themselves aren't necessarily marked `isPublic` individually. 
    // But implied access allows us to fetch them.
    // We need a server action that fetches trips BY IDS bypassing auth if they belong to this public group.

    // Let's rely on `adminDb` directly here or a new helper since `getTrips` is secured.
    // We can iterate the IDs and fetch each doc via Admin SDK in `getAssociatedTrips` helper.

    const associatedTrips = await getAssociatedTrips(group.ids);

    const images = await getCityImages();

    return (
        <GroupContent
            group={group}
            trips={associatedTrips}
            allTrips={[]} // No editing allowed, so no pool needed
            initialImages={images}
            isAuthenticated={false}
            isPublicView={true}
            backgroundImage={(result as any).backgroundImage}
        />
    );
}

// Helper to fetch trips for the public group
import { db } from "@/lib/firebase";

async function getAssociatedTrips(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    // Firestore `in` query supports max 10/30 items. If ids > 10 we might need batches or individual fetches.
    // For this app scale, let's assume < 30 trips per group for now, or fetch individually.
    // Actually, collectionGroup ID query is easier.

    const trips = [];
    // We need to find them. Since we don't know the parent USER ID easily (unless we put it on the group),
    // we have to use collectionGroup query for each ID or `in` query if possible.
    // Simple iteration for now:
    for (const id of ids) {
        try {
            const snapshot = await db.collectionGroup('trips').where('id', '==', id).limit(1).get();
            if (!snapshot.empty) {
                trips.push({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }
        } catch (e) {
            console.error(`Failed to fetch trip ${id} for public group`, e);
        }
    }

    return trips;
}
