import { getPublicGroupTrip } from "@/app/public-share-actions";
import TripContent from "@/app/trip/TripContent";
import { getCityImages } from "@/app/image-actions";
import { AccessRestricted } from "@/components/sharing/AccessRestricted";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PublicGroupTripPageProps {
    params: Promise<{
        token: string; // Group Token
        tripId: string;
    }>;
}

export default async function PublicGroupTripPage({ params }: PublicGroupTripPageProps) {
    const { token, tripId } = await params;

    // Helper that verifies Group Token is Public AND Trip is in that Group
    const result = await getPublicGroupTrip(token, tripId);

    if (!result) {
        notFound();
    }

    if ((result as any).error === "ACCESS_RESTRICTED") {
        return <AccessRestricted />;
    }

    const trip = result;
    const destinationImages = await getCityImages();

    // Fetch Linked Group info for the banner (to allow navigating back to group)
    // We can mock it or fetch it. We know the group exists and is public if we got here.
    // Let's fetch basic group details? Or just pass a mock object with ID since we have token?
    // We don't have ID easily from just token without fetching group again.
    // `getPublicGroupTrip` implementation verified group but didn't return it.
    // Let's assume user just uses browser back or we can fetch group title if we really want to showing "Part of X Group".

    return (
        <TripContent
            initialTrip={trip}
            destinationImages={destinationImages}
            // Pass Linked Group Context
            linkedGroup={{ id: token, title: "Back to Group" }}
            isPublicView={true}
            backgroundImage={(trip as any).backgroundImage}
        />
    );
}
