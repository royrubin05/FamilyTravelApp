"use client";

import { motion } from "framer-motion";
import { ChevronDown, Filter } from "lucide-react";

interface InsightsFiltersProps {
    years: string[];
    selectedYear: string;
    onYearChange: (year: string) => void;
}

export function InsightsFilters({
    years,
    selectedYear,
    onYearChange
}: InsightsFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-start gap-4">

            {/* Year Dropdown */}
            <div className="relative group">
                <select
                    value={selectedYear}
                    onChange={(e) => onYearChange(e.target.value)}
                    className="appearance-none bg-white/5 text-white border border-white/10 rounded-lg pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                >
                    <option value="all" className="bg-neutral-900">All Time</option>
                    {years.map(y => (
                        <option key={y} value={y} className="bg-neutral-900">In {y}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none group-hover:text-white transition-colors" />
            </div>
        </div>
    );
}
