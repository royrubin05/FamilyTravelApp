"use client";

import { useState, useEffect } from "react";
import { useTravelInsights } from "@/hooks/useTravelInsights";
import { InsightsHero } from "./InsightsHero";
import { InsightsGrid } from "./InsightsGrid";
import { InsightsFilters } from "./InsightsFilter";
import { generateInsightAction } from "@/app/insights-actions";

interface InsightsTabProps {
    trips: any[];
    currentTravelerName: string; // The selected traveler's name or "all"
}

export function InsightsTab({ trips, currentTravelerName }: InsightsTabProps) {
    const currentYear = new Date().getFullYear().toString();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Extract available years
    const availableYears = Array.from(new Set(trips.map(t => {
        // Naive extraction from "MMM DD, YYYY"
        const match = t.dates.match(/\d{4}/);
        return match ? match[0] : null;
    }))).filter(Boolean).sort().reverse() as string[];

    const insights = useTravelInsights(trips, currentTravelerName, selectedYear);

    // Effect to generate AI insight
    useEffect(() => {
        if (!insights.hasData) {
            setAiSummary(null);
            return;
        }

        let isMounted = true;

        async function fetchInsight() {
            setIsLoading(true);
            try {
                // Short timeout to prevent flickering if it's super fast? No, we want to show loading immediately if needed.
                // But if we want to show existing template text first?
                // Let's settle on: Show template text initially? Or show skeleton?
                // Let's show skeleton to imply "new calculation".

                const text = await generateInsightAction(
                    {
                        totalMiles: insights.totalMiles,
                        totalHours: insights.totalHours,
                        hotelCount: insights.hotelCount,
                        countryCount: insights.countryCount,
                        topAirline: insights.topAirline,
                        topDestination: insights.topDestination,
                        visitedCities: insights.visitedCities
                    },
                    {
                        name: currentTravelerName,
                        year: selectedYear
                    }
                );

                if (isMounted) setAiSummary(text);
            } catch (err) {
                console.error("Failed to fetch insight", err);
                if (isMounted) setAiSummary(null); // Will fall back to template
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        // Debounce slightly to avoid rapid clicking thrashing
        const timer = setTimeout(() => {
            fetchInsight();
        }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };

    }, [insights, currentTravelerName, selectedYear]);

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
                    <div className="pt-8 relative min-h-[100px]">
                        {isLoading ? (
                            <div className="animate-pulse space-y-3 max-w-2xl mx-auto">
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-5/6 mx-auto"></div>
                                <div className="h-4 bg-white/10 rounded w-4/6 mx-auto"></div>
                            </div>
                        ) : (
                            <InsightsHero quirkyText={aiSummary || insights.fallbackText} />
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 opacity-50">
                    <p className="text-xl font-serif italic text-white/60">
                        {insights.fallbackText || "No travel data found for this selection."}
                    </p>
                </div>
            )}
        </div>
    );
}
