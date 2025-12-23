import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Calendar, Users, Plane, Bed, Check } from "lucide-react";
import { useTrips } from "@/context/TripContext";
import { getDestinationImage, GENERIC_FALLBACK } from "@/lib/imageUtils";
import { isTripCompleted, parseTripDate } from "@/lib/dateUtils";

// ... [existing code] ...

// ...

interface TripListItemProps {
    id: string;
    destination: string;
    dates: string;
    image: string;
    travelers: any[];
    destinationImages?: Record<string, string>;
    hasFlights?: boolean;
    hasHotels?: boolean;
    familyMembers?: any[];
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: (id: string) => void;
}

export function TripListItem({
    id,
    destination = "",
    dates = "",
    image,
    travelers,
    destinationImages,
    hasFlights,
    hasHotels,
    familyMembers = [],
    isSelectionMode = false,
    isSelected = false,
    onToggleSelection
}: TripListItemProps) {
    // Helper to get display name
    const getTravelerName = (t: any) => {
        if (!t.id) return t.name;
        const member = familyMembers.find((m: any) => m.id === t.id);
        return member ? member.name : t.name;
    };

    // ... [existing code] ...

    const isCompleted = isTripCompleted(dates);
    // Removed Status Logic as per request





    const handleCardClick = (e: React.MouseEvent) => {
        if (isSelectionMode && onToggleSelection) {
            e.preventDefault();
            onToggleSelection(id);
        }
    };

    return (
        <>
            <Link href={`/trip?id=${id}`} onClick={handleCardClick} className={`block w-full ${isSelectionMode ? "cursor-pointer" : ""}`}>
                <motion.div
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-stretch gap-3 md:gap-4 p-3 md:p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm transition-colors group relative overflow-hidden ${isSelected ? "border-blue-500/50 bg-blue-500/10" : ""}`}
                >
                    {/* Selection Overlay */}
                    <AnimatePresence>
                        {isSelectionMode && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute top-2 left-2 z-50 pointer-events-none"
                            >
                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-blue-500 border-blue-500" : "border-white/50 bg-black/40"}`}>
                                    {isSelected && <Check className="h-4 w-4 text-white" />}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Mobile: Compact Layout */}
                    <div className="relative h-16 w-16 md:h-20 md:w-20 shrink-0 overflow-hidden rounded-lg bg-white/10 flex items-center justify-center self-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={image || GENERIC_FALLBACK}
                            alt={destination || "Trip"}
                            onError={(e) => {
                                const target = e.currentTarget;
                                if (target.src !== GENERIC_FALLBACK) target.src = GENERIC_FALLBACK;
                            }}
                            className="h-full w-full object-cover grayscale-0 transition-all duration-500"
                        />
                        {/* Removed text overlay for cleaner icon look */}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-2 mb-1">
                            {/* Title extended, date preserved but Title given priority */}
                            <h3 className="text-base md:text-xl font-bold font-serif tracking-wide text-white group-hover:text-amber-100 transition-colors truncate pr-1">
                                {destination}
                            </h3>
                            <span className="text-xs md:text-sm font-bold text-white/80 whitespace-nowrap bg-white/10 px-2 py-0.5 rounded-full md:bg-transparent md:px-0 md:py-0 shrink-0">
                                {(() => {
                                    const ts = parseTripDate(dates);
                                    if (ts === 0) return dates;
                                    return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                                })()}
                            </span>
                        </div>

                        <div className="flex justify-between items-end gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-white/60 truncate min-w-0 flex-1">
                                <Users className="h-3 w-3 opacity-50 shrink-0" />
                                <span className="truncate" title={travelers.map((t: any) => getTravelerName(t)).join(", ")}>
                                    {travelers && travelers.length > 0
                                        ? travelers.map((t: any) => getTravelerName(t)).join(", ")
                                        : "No Travelers"}
                                </span>
                            </div>

                            {/* Icons removed as per user request to provide more room for text */}
                        </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center pl-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-1/2 -translate-y-1/2">
                        <ArrowRight className="h-5 w-5 text-white" />
                    </div>
                </motion.div>
            </Link>
        </>
    );
}
