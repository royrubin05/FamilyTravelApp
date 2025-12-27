"use client";

import { useState } from "react";
import { useTravelInsights } from "@/hooks/useTravelInsights";
import { InsightsHero } from "./InsightsHero";
import { InsightsGrid } from "./InsightsGrid";
import { InsightsFilters } from "./InsightsFilter";

interface InsightsTabProps {
    trips: any[];
    currentTravelerName: string; // The selected traveler's name or "all"
}

export function InsightsTab({ trips, currentTravelerName }: InsightsTabProps) {
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Extract available years
    const availableYears = Array.from(new Set(trips.map(t => {
        // Naive extraction from "MMM DD, YYYY"
        const match = t.dates.match(/\d{4}/);
        return match ? match[0] : null;
    }))).filter(Boolean).sort().reverse() as string[];

    const insights = useTravelInsights(trips, currentTravelerName, selectedYear);

    return (
        <div className="max-w-4xl mx-auto space-y-2 animate-in fade-in duration-500">
            {/* Filters (Moved to Top) */}
            <InsightsFilters
                years={availableYears}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
            />

            {/* Content or "No Data" */}
            {insights.hasData ? (
                <>
                    <div className="mt-8">
                        <InsightsGrid stats={insights} />
                    </div>
                    <div className="pt-8">
                        <InsightsHero quirkyText={insights.quirkyText} />
                    </div>
                </>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <p className="text-xl font-serif italic text-white/60">
                        {insights.quirkyText || "No travel data found for this selection."}
                    </p>
                </div>
            )}
        </div>
    );
}
