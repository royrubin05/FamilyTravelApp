import { Suspense } from 'react';
import TripContent from './TripContent';
import { getCityImages } from '../image-actions';
import { getTrips } from '../trip-actions';
import { getSettings } from '../settings-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { id?: string };
}

export default async function TripPage({ searchParams }: PageProps) {
    const images = await getCityImages();
    const trips = await getTrips();
    const settings = (await getSettings()) as any; // Cast for now as getSettings return type might need update or ignore

    // Await searchParams for Next.js 15+ compatibility
    const resolvedParams = await searchParams;
    const tripId = resolvedParams?.id;

    const initialTrip = trips.find((t: any) => t.id === tripId) || trips[0];

    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Trip...</div>}>
            <TripContent
                destinationImages={images}
                initialTrip={initialTrip}
                familyMembers={settings?.familyMembers || []}
            />
        </Suspense>
    );
}
