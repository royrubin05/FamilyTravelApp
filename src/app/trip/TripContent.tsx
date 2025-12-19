"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartCard } from "@/components/journey/SmartCard";
import { User, Home, Plane, Building, Ticket, Share2, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTrips } from "@/context/TripContext";
import { getDestinationImage, GENERIC_FALLBACK } from "@/lib/imageUtils";

// ...

interface TripContentProps {
    destinationImages?: Record<string, string>;
    initialTrip?: any;
}

export default function TripContent({ destinationImages, initialTrip }: TripContentProps) {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const { trips } = useTrips();

    // Prioritize initial SSR trip, then Context lookup, then fallback
    const trip = initialTrip || trips.find((t) => t.id === id) || trips[0];

    // Derived state for sections
    const flights = trip.flights || [];
    const hotels = trip.hotels || [];
    const activities = trip.activities || [];
    const hasDetails = flights.length > 0 || hotels.length > 0 || activities.length > 0;

    const [activeTab, setActiveTab] = useState<"overview" | "itinerary">("overview");
    const [isShared, setIsShared] = useState(false);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
    };

    return (
        <div className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white/30 pb-20">

            {/* Background Image Layer */}
            <div className="fixed inset-0 z-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {trip && (
                    <img
                        src={(() => {
                            // 1. Check dynamic images map first
                            if (destinationImages) {
                                const key = trip.destination.toLowerCase().trim();
                                if (destinationImages[key]) return destinationImages[key];
                            }

                            // 2. Use trip image if valid
                            if (trip.image && !trip.image.includes("placehold.co")) {
                                return trip.image;
                            }

                            // 3. Fallback
                            return getDestinationImage(trip.destination);
                        })()}
                        alt={trip.destination}
                        onError={(e) => {
                            const target = e.currentTarget;
                            let fallbackUrl = getDestinationImage(trip.destination);

                            // Check dynamic map first
                            if (destinationImages) {
                                const key = trip.destination.toLowerCase().trim();
                                if (destinationImages[key]) fallbackUrl = destinationImages[key];
                            }

                            if (target.src.includes(fallbackUrl) || target.src === GENERIC_FALLBACK) {
                                if (target.src !== GENERIC_FALLBACK) target.src = GENERIC_FALLBACK;
                                return;
                            }
                            target.src = fallbackUrl;
                        }}
                        className="h-full w-full object-cover opacity-50"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
            </div>

            {/* Top Navigation */}
            <div className="relative z-50 p-6 flex justify-between items-center">
                <Link href="/" className="opacity-80 hover:opacity-100 transition-opacity p-2 -ml-2 bg-black/20 rounded-full backdrop-blur-md">
                    <Home className="h-6 w-6" />
                </Link>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleShare}
                        className="p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md border border-white/10 transition-all text-white/80 hover:text-white"
                        title="Share Trip"
                    >
                        {isShared ? <Check className="h-4 w-4 text-green-400" /> : <Share2 className="h-4 w-4" />}
                    </button>
                    <div className="bg-black/20 rounded-full px-4 py-1 backdrop-blur-md border border-white/10">
                        <span className="text-xs uppercase tracking-widest font-bold">{trip.dates}</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 px-6 pt-10">

                {/* Header */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12 text-center relative">
                    <h1 className="text-[12vw] md:text-[8vw] font-serif leading-none tracking-tighter mix-blend-overlay">
                        {trip.destination}
                    </h1>
                </motion.div>

                {/* Content Sections */}
                <div className="max-w-3xl mx-auto space-y-12">

                    {/* Flights Section */}
                    {flights.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-6 opacity-70">
                                <Plane className="h-5 w-5" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Flights</h3>
                            </div>
                            <div className="grid gap-4">
                                {flights.map((flight: any, idx: number) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="font-serif text-xl">{flight.airline}</p>
                                                <p className="text-xs text-white/50 uppercase tracking-wider">{flight.flightNumber}</p>
                                            </div>
                                            {flight.confirmation && (
                                                <div className="bg-white/10 px-3 py-1 rounded text-xs font-mono">
                                                    {flight.confirmation}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center text-sm mb-4">
                                            <div>
                                                <p className="text-white/40 text-xs uppercase mb-1">Departure</p>
                                                <p>{flight.departure}</p>
                                            </div>
                                            <div className="h-px bg-white/20 flex-1 mx-6 relative">
                                                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white/50 rotate-90" />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white/40 text-xs uppercase mb-1">Arrival</p>
                                                <p>{flight.arrival}</p>
                                            </div>
                                        </div>

                                        {/* Travelers on this flight */}
                                        {flight.travelers && flight.travelers.length > 0 && (
                                            <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                                                {flight.travelers.map((tName: string, tIdx: number) => (
                                                    <span key={tIdx} className="inline-flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-medium text-white/80">
                                                        <User className="h-3 w-3 opacity-70" />
                                                        {tName}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Hotels Section */}
                    {hotels.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-6 opacity-70">
                                <Building className="h-5 w-5" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Accommodation</h3>
                            </div>
                            <div className="grid gap-4">
                                {hotels.map((hotel: any, idx: number) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-serif text-xl mb-1">{hotel.name}</p>
                                                <p className="text-sm text-white/60">{hotel.address}</p>
                                            </div>
                                        </div>
                                        <div className="mt-6 flex gap-8 text-sm">
                                            <div>
                                                <p className="text-white/40 text-xs uppercase mb-1">Check In</p>
                                                <p>{hotel.checkIn}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/40 text-xs uppercase mb-1">Check Out</p>
                                                <p>{hotel.checkOut}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Travelers/Family Mapping Section */}
                    {trip.travelers?.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-6 opacity-70">
                                <User className="h-5 w-5" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Travelers</h3>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                {trip.travelers.map((traveler: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white/10 rounded-full pl-2 pr-4 py-2 border border-white/5">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                            {traveler.name ? traveler.name[0] : "?"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{traveler.name}</p>
                                            <p className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">{traveler.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Empty State */}
                    {!hasDetails && trip.travelers.length === 0 && (
                        <div className="text-center py-20 opacity-40 border-2 border-dashed border-white/10 rounded-xl">
                            <p>No specific itinerary details found.</p>
                        </div>
                    )}

                    {/* Source Document Download - Moved to Bottom */}
                    {trip.sourceDocument && (
                        <div className="pt-12 flex justify-center pb-20">
                            <a
                                href={trip.sourceDocument}
                                download={trip.sourceFileName || "trip-source.pdf"}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md text-sm font-medium transition-all"
                            >
                                <Ticket className="h-4 w-4" />
                                Download Source Document
                            </a>
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}
