import { Suspense } from 'react';
import TripContent from './TripContent';
import { getCityImages } from '../image-actions';
import { getTrips, getTripGroups } from '../trip-actions';
import { getSettings } from '../settings-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: { id?: string };
}

import { cookies } from 'next/headers';

// ...


export default async function TripPage({ searchParams }: PageProps) {
    const images = await getCityImages();
    const trips = await getTrips();
    const groups = await getTripGroups();
    const settings = (await getSettings()) as any;

    // Check auth status
    const cookieStore = await cookies();
    const isAuthenticated = !!cookieStore.get("auth_session");

    // Await searchParams for Next.js 15+ compatibility
    const resolvedParams = await searchParams;
    const tripId = resolvedParams?.id;

    const initialTrip = trips.find((t: any) => t.id === tripId) || trips[0];

    // Find if this trip is part of a group
    const linkedGroup = groups.find((g: any) => g.ids?.includes(initialTrip?.id));

    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Trip...</div>}>
            <TripContent
                destinationImages={images}
                initialTrip={initialTrip}
                familyMembers={settings?.familyMembers || []}
                isAuthenticated={isAuthenticated}
                linkedGroup={linkedGroup}
                backgroundImage={settings?.backgroundImage}
            />
        </Suspense>
    );
}
