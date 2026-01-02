
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import TripContent from '../../../trip/TripContent';
import { getCityImages } from '../../../image-actions';
import { getTrip } from '../../../trip-actions';
import { getSettings } from '../../../settings-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: { id: string };
}

export default async function SharedTripPage({ params }: PageProps) {
    // Await params for Next.js 15+ compatibility
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const [trip, images, settings, cookieStore] = await Promise.all([
        getTrip(id),
        getCityImages(),
        getSettings(),
        cookies()
    ]);

    if (!trip) {
        notFound();
    }

    const isAuthenticated = !!cookieStore.get("auth_session");

    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Trip...</div>}>
            <TripContent
                destinationImages={images}
                initialTrip={trip}
                familyMembers={(settings as any)?.familyMembers || []}
                isAuthenticated={isAuthenticated}
            />
        </Suspense>
    );
}
