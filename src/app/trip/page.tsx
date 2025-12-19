import { Suspense } from 'react';
import TripContent from './TripContent';

export default function TripPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TripContent />
        </Suspense>
    );
}
