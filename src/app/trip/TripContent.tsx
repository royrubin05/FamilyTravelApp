"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartCard } from "@/components/journey/SmartCard";
import { User, Home, Plane, Building, Ticket, Share2, Check, Copy, X, FolderOpen, Trash2, Terminal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTrips } from "@/context/TripContext";
import { getDestinationImage, GENERIC_FALLBACK, getNormalizedKeys } from "@/lib/imageUtils";
import { getCheckInUrl } from "@/lib/airlineUtils";
import { getStorageUrl } from "@/lib/storageUtils";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { removeTravelerFromTripAction } from "@/app/trip-actions";
import { DebugPromptModal } from "@/components/ui/DebugPromptModal";

interface TripContentProps {
    destinationImages?: Record<string, string>;
    initialTrip?: any;
    familyMembers?: any[];
}

export default function TripContent({ destinationImages, initialTrip, familyMembers = [] }: TripContentProps) {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const { trips } = useTrips();

    // Prioritize initial SSR trip, then Context lookup, then fallback
    const trip = initialTrip || trips.find((t: any) => t.id === id) || trips[0];

    // Derived state for sections
    const flights = trip.flights || [];
    const hotels = trip.hotels || [];
    const activities = trip.activities || [];
    const hasDetails = flights.length > 0 || hotels.length > 0 || activities.length > 0;

    // Helper to merge duplicate flights (same plane, different confirmation/traveler record)
    const mergeFlights = (flightList: any[]) => {
        return flightList.reduce((acc: any[], flight: any) => {
            const key = `${flight.airline}-${flight.flightNumber}-${flight.departure}`;
            const existing = acc.find((f: any) => `${f.airline}-${f.flightNumber}-${f.departure}` === key);

            if (existing) {
                // Merge confirmations
                if (flight.confirmation) {
                    if (!existing.allConfirmations) existing.allConfirmations = existing.confirmation ? [existing.confirmation] : [];
                    if (!existing.allConfirmations.includes(flight.confirmation)) {
                        existing.allConfirmations.push(flight.confirmation);
                    }
                }
                // Merge travelers check (though we group by traveler, so this might be redundant but safe)
                if (flight.travelers) {
                    const newTravelers = [...(existing.travelers || []), ...flight.travelers];
                    existing.travelers = Array.from(new Set(newTravelers));
                }
            } else {
                acc.push({
                    ...flight,
                    allConfirmations: flight.confirmation ? [flight.confirmation] : []
                });
            }
            return acc;
        }, []).sort((a: any, b: any) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
    };

    // Advanced Grouping: Group Travelers by Itinerary
    const flightGroups = (() => {
        const allTravelers = Array.from(new Set(flights.flatMap((f: any) => f.travelers || []))) as string[];
        const signatures = new Map<string, string>(); // traveler -> signature

        // 1. Calculate signature for each traveler
        allTravelers.forEach(t => {
            const myFlights = flights.filter((f: any) => f.travelers?.includes(t));
            myFlights.sort((a: any, b: any) => new Date(a.departure).getTime() - new Date(b.departure).getTime());
            const sig = myFlights.map((f: any) => `${f.airline}-${f.flightNumber}-${f.departure}`).join('|');
            signatures.set(t, sig);
        });

        // 2. Group travelers by signature
        const groupsMap = new Map<string, string[]>();
        signatures.forEach((sig, traveler) => {
            if (!groupsMap.has(sig)) groupsMap.set(sig, []);
            groupsMap.get(sig)?.push(traveler);
        });

        // 3. Build group objects
        const results = Array.from(groupsMap.entries()).map(([sig, groupTravelers]) => {
            // Get flights relevant to this group (filtered by signature mostly, but re-fetching to be safe)
            // We can just grab flights for the first traveler in the group
            const representative = groupTravelers[0];
            const rawFlights = flights.filter((f: any) => f.travelers?.includes(representative));
            const mergedFlights = mergeFlights(rawFlights);

            return { travelers: groupTravelers, flights: mergedFlights };
        });

        // 4. Handle orphans (flights with NO travelers)
        const orphanFlights = flights.filter((f: any) => !f.travelers || f.travelers.length === 0);
        if (orphanFlights.length > 0) {
            results.push({ travelers: ["Other Items"], flights: mergeFlights(orphanFlights) });
        }

        return results;
    })();

    const [activeTab, setActiveTab] = useState<"overview" | "itinerary">("overview");
    const [isShared, setIsShared] = useState(false);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
    };

    const [copiedConfirmation, setCopiedConfirmation] = useState<string | null>(null);
    const handleCopyConfirmation = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedConfirmation(code);
        setTimeout(() => setCopiedConfirmation(null), 2000);
    };

    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const router = useRouter();
    const { deleteTrip } = useTrips(); // useTrips is already called below, careful of duplicates

    const handleDelete = async () => {
        if (trip.id) {
            await deleteTrip(trip.id);
            router.push("/");
        }
    };

    const [travelerToRemove, setTravelerToRemove] = useState<{ id?: string, name: string } | null>(null);


    const handleRemoveTraveler = async () => {
        if (!trip.id || !travelerToRemove) return;

        // Optimistic update or wait for server? Wait for server for safety.
        await removeTravelerFromTripAction(trip.id, travelerToRemove);
        setTravelerToRemove(null);
        router.refresh();
    };

    // Helper to get display name
    const getTravelerName = (t: any) => {
        if (!t.id) return t.name;
        const member = familyMembers.find((m: any) => m.id === t.id);
        return member ? member.name : t.name;
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
                                const keys = getNormalizedKeys(trip.destination);
                                for (const key of keys) {
                                    if (destinationImages[key]) return destinationImages[key];
                                }
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
                                const keys = getNormalizedKeys(trip.destination);
                                for (const key of keys) {
                                    if (destinationImages[key]) fallbackUrl = destinationImages[key];
                                }
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
                        className="flex items-center gap-2 px-3 py-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md border border-white/10 transition-all text-white/80 hover:text-white"
                        title="Share Trip"
                    >
                        {isShared ? (
                            <>
                                <Check className="h-4 w-4 text-green-400" />
                                <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Copied!</span>
                            </>
                        ) : (
                            <Share2 className="h-4 w-4" />
                        )}
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
                            <div className="space-y-8">
                                {flightGroups.map((group, gIdx) => (
                                    <div key={gIdx}>
                                        <div className="flex items-center gap-2 mb-4 bg-white/5 w-fit px-4 py-2 rounded-full border border-white/5">
                                            {group.travelers.map((t, tIdx) => (
                                                <div key={tIdx} className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white/90">{getTravelerName({ name: t })}</span>
                                                    {tIdx < group.travelers.length - 1 && <span className="text-white/30">/</span>}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid gap-4">
                                            {group.flights.map((flight: any, idx: number) => (
                                                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <p className="font-serif text-xl">{flight.airline}</p>
                                                            <p className="text-xs text-white/50 uppercase tracking-wider">{flight.flightNumber}</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2 items-end">
                                                            {/* Render all confirmations */}
                                                            {flight.allConfirmations && flight.allConfirmations.length > 0 && flight.allConfirmations.map((conf: string, cIdx: number) => (
                                                                <button
                                                                    key={cIdx}
                                                                    onClick={() => handleCopyConfirmation(conf)}
                                                                    className="group/code relative bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 px-4 py-2 rounded-lg backdrop-blur-md transition-all text-left w-full sm:w-auto min-w-[140px]"
                                                                    title="Copy Confirmation Code"
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="text-[10px] text-green-400/60 uppercase tracking-widest leading-none mb-1">Confirmation {flight.allConfirmations.length > 1 ? `#${cIdx + 1}` : ''}</p>
                                                                            <p className="text-xl font-mono font-bold text-green-300 tracking-wider">
                                                                                {conf}
                                                                            </p>
                                                                        </div>
                                                                        <div className="opacity-0 group-hover/code:opacity-100 transition-opacity ml-3 mt-1">
                                                                            {copiedConfirmation === conf ? (
                                                                                <Check className="h-4 w-4 text-green-400" />
                                                                            ) : (
                                                                                <Copy className="h-4 w-4 text-green-400/50" />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {copiedConfirmation === conf && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: 5 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-green-400 text-xs px-2 py-1 rounded whitespace-nowrap"
                                                                        >
                                                                            Copied!
                                                                        </motion.div>
                                                                    )}
                                                                </button>
                                                            ))}

                                                            {getCheckInUrl(flight.airline) && (
                                                                <a
                                                                    href={getCheckInUrl(flight.airline) as string}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] font-bold uppercase tracking-widest text-blue-300 hover:text-blue-200 flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/20 transition-all"
                                                                >
                                                                    <span>Check In Online</span>
                                                                    <Share2 className="h-3 w-3 -rotate-45" />
                                                                </a>
                                                            )}
                                                        </div>
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
                                                </div>
                                            ))}
                                        </div>
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
                    {
                        trip.travelers?.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-6 opacity-70">
                                    <User className="h-5 w-5" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest">Travelers</h3>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    {trip.travelers.map((traveler: any, idx: number) => {
                                        const displayName = getTravelerName(traveler);
                                        return (
                                            <div key={idx} className="group relative flex items-center gap-3 bg-white/10 rounded-full pl-2 pr-4 py-2 border border-white/5 transition-colors hover:border-white/20 select-none">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                                    {displayName ? displayName[0] : "?"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium leading-none">{displayName}</p>
                                                </div>

                                                {/* Remove Button (Hover only) */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTravelerToRemove({ id: traveler.id, name: traveler.name });
                                                    }}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                                                    title="Remove Traveler"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )
                    }

                    {/* Empty State */}
                    {
                        !hasDetails && trip.travelers.length === 0 && (
                            <div className="text-center py-20 opacity-40 border-2 border-dashed border-white/10 rounded-xl">
                                <p>No specific itinerary details found.</p>
                            </div>
                        )
                    }

                    {/* Source Documents Section */}
                    {
                        (() => {
                            const docs = [];
                            if (trip.sourceDocuments && Array.isArray(trip.sourceDocuments)) {
                                docs.push(...trip.sourceDocuments);
                            } else if (trip.sourceDocument) {
                                docs.push({ url: trip.sourceDocument, name: trip.sourceFileName || "Source Document" });
                            }

                            if (docs.length === 0) return null;

                            return (
                                <>
                                    <div className="pt-12 flex flex-col items-center gap-4 pb-8">
                                        {docs.length > 1 ? (
                                            <button
                                                onClick={() => setIsDocsModalOpen(true)}
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md text-sm font-medium transition-all w-full max-w-xs justify-center group"
                                            >
                                                <FolderOpen className="h-4 w-4 text-white/70 group-hover:text-amber-300 transition-colors" />
                                                <span>Download {docs.length} Source Documents</span>
                                            </button>
                                        ) : (
                                            <a
                                                href={getStorageUrl(docs[0].url)}
                                                download={docs[0].name}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl backdrop-blur-md text-sm font-medium transition-all w-full max-w-xs justify-center"
                                            >
                                                <Ticket className="h-4 w-4 shrink-0" />
                                                <span className="truncate max-w-[250px]">{docs[0].name}</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* Source Docs Modal */}
                                    <AnimatePresence>
                                        {isDocsModalOpen && (
                                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setIsDocsModalOpen(false)}
                                                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                                                />
                                                <motion.div
                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.95, opacity: 0 }}
                                                    className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
                                                >
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h3 className="font-serif text-xl">Source Documents</h3>
                                                        <button onClick={() => setIsDocsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                                            <X className="h-5 w-5 opacity-70" />
                                                        </button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {docs.map((doc: any, idx: number) => (
                                                            <a
                                                                key={idx}
                                                                href={getStorageUrl(doc.url)}
                                                                download={doc.name}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all group"
                                                            >
                                                                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors">
                                                                    <Ticket className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-sm truncate">{doc.name}</p>
                                                                    <p className="text-xs text-white/40 truncate">PDF Document</p>
                                                                </div>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                                                    <Copy className="h-4 w-4 rotate-180" /> {/* Using Copy as 'Download' icon approximation or just generic arrow */}
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </>
                            );
                        })()
                    }

                </div >

                {/* Bottom Actions */}
                <div className="flex justify-center items-center gap-4 mt-4 mb-8">
                    <button
                        onClick={() => setIsDebugModalOpen(true)}
                        className="text-white/30 hover:text-purple-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full"
                    >
                        <Terminal className="h-4 w-4" />
                        Debug Info
                    </button>

                    <div className="h-4 w-px bg-white/10" />

                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="text-white/30 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Trip
                    </button>
                </div>
            </div >

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Trip"
                message={`Are you sure you want to remove the trip to ${trip.destination}? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                isDestructive={true}
            />

            <ConfirmationModal
                isOpen={!!travelerToRemove}
                title="Remove Traveler"
                message={`Are you sure you want to remove ${travelerToRemove?.name || "this traveler"} from the trip?`}
                confirmLabel="Remove"
                onConfirm={handleRemoveTraveler}
                onCancel={() => setTravelerToRemove(null)} // Clear selection on cancel
                isDestructive={true}
            />

            <DebugPromptModal
                isOpen={isDebugModalOpen}
                onClose={() => setIsDebugModalOpen(false)}
                debugPrompt={trip.debugPrompt}
                debugResponse={trip.debugResponse}
            />

        </div >
    );
}
