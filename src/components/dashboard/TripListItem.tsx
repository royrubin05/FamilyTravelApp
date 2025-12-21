import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Plane, Bed } from "lucide-react";
import { useTrips } from "@/context/TripContext";
import { getDestinationImage, GENERIC_FALLBACK } from "@/lib/imageUtils";
import { isTripCompleted } from "@/lib/dateUtils";

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

    // Dynamic Status Logic
    let status = "Upcoming";
    let statusColor = "bg-white/10 text-white/50";

    const now = new Date();
    // Rudimentary parsing for "Oct 12 - Oct 27" styled dates or full dates
    // Ideally we'd store structured dates. For now, we check simplistic logic or keywords.
    // However, if we assume the dates string contains a year or is current year:

    // For manual testing/demo purposes, let's allow hardcoded override by ID first (as before)
    // but also check for "In Process" keywords if provided, or defaults.

    const isCompleted = isTripCompleted(dates);

    if (isCompleted) {
        status = "Completed";
        statusColor = "bg-white/10 text-white/50";
    } else if ((dates || "").toLowerCase().includes("spring") || (dates || "").toLowerCase().includes("dec")) {
        // Keep season highlights as upcoming
        status = "Upcoming";
        statusColor = "bg-amber-500/20 text-amber-300";
    } else {
        // Fallback for new uploads - assume Upcoming unless we determine otherwise
        status = "Upcoming";
        statusColor = "bg-blue-500/20 text-blue-300";
    }

    // "In-Process" Simulation (e.g., if today matches)
    // To demo "In-Process", let's say if the destination is "InFlight" or user manually sets it.
    // For this prototype, I'll toggle based on ID for demonstration if needed, 
    // or we can add a simple check:
    if (id === "demo-active") {
        status = "In-Process";
        statusColor = "bg-green-500/20 text-green-300 pulse-animation";
    }



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
                            className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
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

                        {/* Dates */}
                        <div className="hidden md:flex items-center gap-2 text-sm text-white/60">
                            <Calendar className="h-4 w-4 opacity-50" />
                            <span>{dates}</span>
                        </div>

                        {/* Travelers */}
                        <div className="hidden md:flex items-center gap-2 text-sm text-white/60 overflow-hidden">
                            <Users className="h-4 w-4 opacity-50 shrink-0" />
                            <span className="truncate max-w-[200px]" title={travelers.map((t: any) => getTravelerName(t)).join(", ")}>
                                {travelers && travelers.length > 0
                                    ? travelers.map((t: any) => getTravelerName(t)).join(", ")
                                    : "No Travelers"}
                            </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-end md:justify-start">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${statusColor}`}>
                                {status}
                            </span>
                        </div>
                    </div>

                    {/* Aggregation Icons */}
                    <div className="flex flex-col gap-2 items-end justify-center mr-4 opacity-50">
                        {hasFlights && <Plane className="h-4 w-4 text-white" />}
                        {hasHotels && <Bed className="h-4 w-4 text-white" />}
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
