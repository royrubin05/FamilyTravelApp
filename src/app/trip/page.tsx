import { Suspense } from 'react';
import TripContent from './TripContent';
import { getCityImages } from '../image-actions';

export default async function TripPage() {
    const images = await getCityImages();

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TripContent destinationImages={images} />
        </Suspense>
    );
}
