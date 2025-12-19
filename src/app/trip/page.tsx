import { Suspense } from 'react';
import TripContent from './TripContent';
import { getCityImages } from '../image-actions';
import { getTrips } from '../trip-actions';

interface PageProps {
    searchParams: { id?: string };
}

export default async function TripPage({ searchParams }: PageProps) {
    const images = await getCityImages();
    const trips = await getTrips();

    // Find key trip on server to ensure immediate render
    const tripId = searchParams?.id;
    const initialTrip = trips.find((t: any) => t.id === tripId) || trips[0];

    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Trip...</div>}>
            <TripContent destinationImages={images} initialTrip={initialTrip} />
        </Suspense>
    );
}
