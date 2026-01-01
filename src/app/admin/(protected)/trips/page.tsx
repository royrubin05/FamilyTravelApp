"use client";

import { GlobalTripManager } from "@/components/admin/GlobalTripManager";

export default function AdminTripsPage() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Global Trip Manager</h1>
                <p className="text-neutral-400">View and manage trips across all family accounts.</p>
            </div>

            <GlobalTripManager />
        </div>
    );
}
