import { Suspense } from 'react';
import TripContent from './TripContent';
import { getCityImages } from '../image-actions';
import { getTrips } from '../trip-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { id?: string };
}

export default async function TripPage({ searchParams }: PageProps) {
    const images = await getCityImages();
    const trips = await getTrips();

    // Await searchParams for Next.js 15+ compatibility
    const resolvedParams = await searchParams;
    const tripId = resolvedParams?.id;

    const initialTrip = trips.find((t: any) => t.id === tripId) || trips[0];

    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Trip...</div>}>
            <TripContent destinationImages={images} initialTrip={initialTrip} />
        </Suspense>
    );
}
