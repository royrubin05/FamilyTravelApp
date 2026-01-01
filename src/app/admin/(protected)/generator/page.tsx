"use client";

import { TripGenerator } from "@/components/admin/TripGenerator";

export default function AdminGeneratorPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Fake Trip Generator</h1>
                <p className="text-neutral-400">Generate randomized test data for the platform.</p>
            </div>

            <TripGenerator />
        </div>
    );
}
