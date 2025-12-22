import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Plane, Bed } from "lucide-react";
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
}

export function TripListItem({ id, destination = "", dates = "", image, travelers, destinationImages, hasFlights, hasHotels, familyMembers = [] }: TripListItemProps) {
    // Helper to get display name
    const getTravelerName = (t: any) => {
        if (!t.id) return t.name;
        const member = familyMembers.find((m: any) => m.id === t.id);
        return member ? member.name : t.name;
    };

    // ... [existing code] ...

    const isCompleted = isTripCompleted(dates);
    // Removed Status Logic as per request





    return (
        <>
            <Link href={`/trip?id=${id}`} className="block w-full">
                <motion.div
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                    whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm transition-colors group"
                >
                    {/* Small Thumbnail */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={(() => {
                                // 1. Check dynamic images map first (Override)
                                if (destinationImages) {
                                    const key = (destination || "").toLowerCase().trim();
                                    if (destinationImages[key]) return destinationImages[key];

                                    // Partial map scan
                                    const found = Object.keys(destinationImages).find(k => key.includes(k));
                                    if (found) return destinationImages[found];
                                }

                                // 2. Use trip image if valid
                                if (image && !image.includes("placehold.co")) {
                                    return image;
                                }

                                // 3. Fallback to client-side static lookup
                                return getDestinationImage(destination || "");
                            })()}
                            alt={destination || "Trip"}
                            onError={(e) => {
                                const target = e.currentTarget;
                                // If the primary failed, fall back to GENERIC or try static
                                // Since we already tried the best source in src={}, just go to generic fallback
                                // unless we haven't tried getDestinationImage logic fully (e.g. if src was from trip.image)

                                const staticFallback = getDestinationImage(destination || "");
                                if (!target.src.includes(staticFallback) && target.src !== GENERIC_FALLBACK) {
                                    target.src = staticFallback;
                                    return;
                                }

                                if (target.src !== GENERIC_FALLBACK) target.src = GENERIC_FALLBACK;
                            }}
                            className="h-full w-full object-cover grayscale-0 md:grayscale md:group-hover:grayscale-0 transition-all duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center -z-10">
                            <span className="text-xs font-serif text-white/30">{(destination || "").substring(0, 2)}</span>
                        </div>
                    </div>

                    {/* Data Columns */}
                    <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">

                        {/* Destination */}
                        <div className="col-span-2 md:col-span-1">
                            <h3 className="text-lg font-bold font-serif tracking-wide text-white group-hover:text-amber-100 transition-colors">
                                {destination}
                            </h3>
                        </div>

                        {/* Dates - Hidden on mobile, simplified on Desktop since we have the main date on right now */}
                        {/* Actually user said 'add a date ... instead', implying main visibility.
                             I will keep the raw range here for detail if needed, or remove if redundant.
                             Let's remove the raw date column to clean up, as the "Month, Year" is the primary date now.
                             Or replace it with Travelers count only?
                             Let's keep Travelers.
                          */}

                        {/* Travelers */}
                        <div className="hidden md:flex items-center gap-2 text-sm text-white/60 overflow-hidden">
                            <Users className="h-4 w-4 opacity-50 shrink-0" />
                            <span className="truncate max-w-[200px]" title={travelers.map((t: any) => getTravelerName(t)).join(", ")}>
                                {travelers && travelers.length > 0
                                    ? travelers.map((t: any) => getTravelerName(t)).join(", ")
                                    : "No Travelers"}
                            </span>
                        </div>

                        {/* Status / Date / Icons Wrapper - Adaptive Layout */}
                        {/* Mobile: Row (Date + Icons), Desktop: Column (Date top, Icons bottom right) */}
                        <div className="col-span-2 md:col-span-1 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:pl-4 border-t border-white/5 pt-2 mt-1 md:border-none md:pt-0 md:mt-0">
                            {/* Month, Year */}
                            <div className="text-left md:text-right">
                                <span className="block text-sm font-medium text-white/70 md:text-white group-hover:text-white transition-colors">
                                    {(() => {
                                        const ts = parseTripDate(dates);
                                        if (ts === 0) return dates;
                                        return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                                    })()}
                                </span>
                            </div>

                            {/* Icons Row */}
                            <div className="flex items-center gap-2">
                                {hasFlights && (
                                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-500/10 md:bg-blue-500/20 flex items-center justify-center border border-blue-500/20 md:border-blue-500/30" title="Flights">
                                        <Plane className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-300" />
                                    </div>
                                )}
                                {hasHotels && (
                                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-amber-500/10 md:bg-amber-500/20 flex items-center justify-center border border-amber-500/20 md:border-amber-500/30" title="Hotels">
                                        <Bed className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-300" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Icons */}
                    <div className="flex items-center gap-6 pr-2">
                        <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </motion.div>
            </Link>
        </>
    );
}
