"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { GlobalTripManager } from "@/components/admin/GlobalTripManager";

export default function AdminPage() {
    return (
        <div className="space-y-8 mt-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-neutral-400">Manage families and view global trip data.</p>
                </div>
                <Link
                    href="/admin/families"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                >
                    <Users className="h-4 w-4" />
                    Manage Families
                </Link>
            </div>

            {/* Main Content */}
            <GlobalTripManager />
        </div>
    );
}
