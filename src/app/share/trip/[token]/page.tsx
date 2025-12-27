import { getPublicEntity } from "@/app/public-share-actions";
import TripContent from "@/app/trip/TripContent";
import { getCityImages } from "@/app/image-actions";
import { AccessRestricted } from "@/components/sharing/AccessRestricted";
import { notFound } from "next/navigation";

// Force dynamic because we are fetching based on unique token and it's public
export const dynamic = 'force-dynamic';

interface PublicTripPageProps {
    params: Promise<{ token: string }>;
}

export default async function PublicTripPage({ params }: PublicTripPageProps) {
    const { token } = await params;
    const result = await getPublicEntity("trip", token);

    if (!result) {
        notFound();
    }

    if ((result as any).error === "ACCESS_RESTRICTED") {
        return <AccessRestricted />;
    }

    const trip = result;
    const images = await getCityImages();

    // In Public View, we don't pass 'familyMembers' or 'isAuthenticated' effectively disabling edit features
    return (
        <TripContent
            destinationImages={images}
            initialTrip={trip}
            familyMembers={[]}
            isAuthenticated={false}
            isPublicView={true}
            backgroundImage={(result as any).backgroundImage}
        />
    );
}
