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
                            src={(() => {
                                if (destinationImages) {
                                    const key = (destination || "").toLowerCase().trim();
                                    if (destinationImages[key]) return destinationImages[key];
                                    const found = Object.keys(destinationImages).find(k => key.includes(k));
                                    if (found) return destinationImages[found];
                                }
                                if (image && !image.includes("placehold.co")) return image;
                                return getDestinationImage(destination || "");
                            })()}
                            alt={destination || "Trip"}
                            onError={(e) => {
                                const target = e.currentTarget;
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

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="text-base md:text-xl font-bold font-serif tracking-wide text-white group-hover:text-amber-100 transition-colors truncate pr-2">
                                {destination}
                            </h3>
                            <span className="text-xs md:text-sm font-bold text-white/80 whitespace-nowrap bg-white/10 px-2 py-0.5 rounded-full md:bg-transparent md:px-0 md:py-0">
                                {(() => {
                                    const ts = parseTripDate(dates);
                                    if (ts === 0) return dates;
                                    return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                                })()}
                            </span>
                        </div>

                        <div className="flex justify-between items-end gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-white/60 truncate min-w-0">
                                <Users className="h-3 w-3 opacity-50 shrink-0" />
                                <span className="truncate" title={travelers.map((t: any) => getTravelerName(t)).join(", ")}>
                                    {travelers && travelers.length > 0
                                        ? travelers.map((t: any) => getTravelerName(t)).join(", ")
                                        : "No Travelers"}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                {hasFlights && (
                                    <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-blue-500/20 md:bg-blue-500/10 hover:bg-blue-500/30 flex items-center justify-center border border-blue-500/30 md:border-blue-500/20 transition-colors shadow-[0_0_10px_rgba(59,130,246,0.1)]" title="Flights">
                                        <Plane className="h-3 w-3 md:h-4 md:w-4 text-blue-300 md:text-blue-300/80 group-hover:text-blue-200" />
                                    </div>
                                )}
                                {hasHotels && (
                                    <div className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-amber-500/20 md:bg-amber-500/10 hover:bg-amber-500/30 flex items-center justify-center border border-amber-500/30 md:border-amber-500/20 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.1)]" title="Hotels">
                                        <Bed className="h-3 w-3 md:h-4 md:w-4 text-amber-300 md:text-amber-300/80 group-hover:text-amber-200" />
                                    </div>
                                )}
                            </div>
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
