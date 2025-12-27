"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartCard } from "@/components/journey/SmartCard";
import { User, Home, Plane, Building, Ticket, Share2, Check, Copy, X, FolderOpen, Trash2, Terminal, Activity, Layers, ChevronRight, ChevronLeft, ArchiveRestore, Ban } from "lucide-react";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTrips } from "@/context/TripContext";
import { getDestinationImage, GENERIC_FALLBACK, getNormalizedKeys } from "@/lib/imageUtils";
import { getCheckInUrl } from "@/lib/airlineUtils";
import { getStorageUrl } from "@/lib/storageUtils";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { removeTravelerFromTripAction, cancelTripAction } from "@/app/trip-actions";
import { DebugPromptModal } from "@/components/ui/DebugPromptModal";
import { getTripRouteTitle } from "@/lib/tripUtils";

import { ShareControl } from "@/components/sharing/ShareControl";
import { PublicHeader } from "@/components/ui/PublicHeader";
import EditTripModal from "@/components/trip/EditTripModal";

interface TripContentProps {
    destinationImages?: Record<string, string>;
    initialTrip?: any;
    familyMembers?: any[];
    isAuthenticated?: boolean;
    linkedGroup?: any;
    backgroundImage?: string | null;
    isPublicView?: boolean;
}

export default function TripContent({ destinationImages, initialTrip, familyMembers = [], isAuthenticated = false, linkedGroup, backgroundImage, isPublicView = false }: TripContentProps) {
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

    // Simplified: Just use flat flights list (merged)
    // Removed flightGroups logic as per user request to remove traveler grouping.

    const [activeTab, setActiveTab] = useState<"overview" | "itinerary">("overview");


    const [copiedConfirmation, setCopiedConfirmation] = useState<string | null>(null);
    const handleCopyConfirmation = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedConfirmation(code);
        setTimeout(() => setCopiedConfirmation(null), 2000);
    };

    const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
    const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
    const [isEditTripModalOpen, setIsEditTripModalOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

    const router = useRouter();
    const { deleteTrip } = useTrips(); // useTrips is already called below, careful of duplicates

    const handleDelete = async () => {
        if (trip.id) {
            await deleteTrip(trip.id);
            router.push("/");
        }
    };

    const [cancelCredits, setCancelCredits] = useState<Record<string, number>>({});
    const [totalCancelCredit, setTotalCancelCredit] = useState<string>("");
    const [applyCreditEvenly, setApplyCreditEvenly] = useState(true);
    const [creditExpirationDate, setCreditExpirationDate] = useState<string>("");

    // Initialize credits state when modal opens
    useEffect(() => {
        if (isCancelModalOpen && trip.travelers) {
            const initial: Record<string, number> = {};
            trip.travelers.forEach((t: any) => {
                const key = t.id || t.name;
                initial[key] = 0;
            });
            setCancelCredits(initial);
            // setApplyCreditEvenly(true); // Default to true always
        }
    }, [isCancelModalOpen, trip.travelers]);

    const handleCancel = async () => {
        if (trip.id) {
            await cancelTripAction(trip.id, cancelCredits, creditExpirationDate);
            router.push("/");
        }
    };

    // Calculate validation
    const currentAllocated = Object.values(cancelCredits).reduce((a, b) => a + b, 0);
    const totalInput = parseFloat(totalCancelCredit) || 0;
    const isAllocationMismatch = !applyCreditEvenly && Math.abs(currentAllocated - totalInput) > 0.01 && totalInput > 0;

    const handleCreditChange = (travelerId: string, value: string) => {
        const num = parseFloat(value) || 0;
        setCancelCredits(prev => ({ ...prev, [travelerId]: num }));
    };

    // ...

    const [travelerToRemove, setTravelerToRemove] = useState<{ id?: string, name: string } | null>(null);

    const handleRemoveTraveler = async () => {
        if (!trip.id || !travelerToRemove) return;
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
        <div className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white/30 p-4 md:p-8 pb-20">

            {/* Background Image Layer */}
            <div className="fixed inset-0 z-0">
                {backgroundImage ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-fixed transition-all duration-700"
                        style={{
                            backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${backgroundImage})`
                        }}
                    />
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {/* Top Navigation */}
            {isPublicView ? (
                <PublicHeader />
            ) : (
                <GlobalHeader
                    additionalMenuItems={isAuthenticated ? [
                        {
                            label: "Share Trip",
                            onClick: () => setIsEditTripModalOpen(true),
                            icon: <Share2 className="h-4 w-4" />,
                            className: "text-neutral-800"
                        },
                        { type: 'separator' },
                        {
                            label: "Cancel Trip / Credit",
                            onClick: () => setIsCancelModalOpen(true),
                            icon: <Ban className="h-4 w-4" />,
                            className: "text-neutral-800"
                        },
                        { type: 'separator' },
                        {
                            label: "Delete Trip",
                            onClick: () => setIsDeleteModalOpen(true),
                            icon: <Trash2 className="h-4 w-4" />,
                            className: "text-red-600 font-bold hover:bg-red-50"
                        }
                    ] : []}
                />
            )}

            {/* Main Content */}
            <div className="relative z-10 px-6 pt-10">

                {/* Linked Group Banner - Hide in Public View if not relevant (assumed hidden for now to avoid complexity) */}
                {!isPublicView && linkedGroup && (
                    <Link href={`/group/${linkedGroup.id}`}>
                        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Layers className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Part of Trip Group</p>
                                    <p className="text-blue-100 font-medium group-hover:text-blue-50 transition-colors">{linkedGroup.title}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-white/40 group-hover:text-white/80 transition-colors text-sm">
                                <span>View Group</span>
                                <ChevronRight className="h-4 w-4" />
                            </div>
                        </div>
                    </Link>
                )}

                {/* Header */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12 text-center relative">
                    <h1 className="text-[8vw] md:text-[6vw] font-bold leading-none tracking-tighter mix-blend-overlay px-4">
                        {trip.ai_summary?.human_title || trip.trip_title_page || trip.destination}
                    </h1>
                    {trip.ai_summary?.verbose_description && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-xl text-white/70 mt-4 max-w-2xl mx-auto font-light leading-relaxed px-6"
                        >
                            {trip.ai_summary.verbose_description}
                        </motion.p>
                    )}
                </motion.div>

                {/* Content Sections */}
                <div className="max-w-4xl mx-auto space-y-12">

                    {/* Flights Section */}
                    {flights.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-6 opacity-70">
                                <Plane className="h-5 w-5" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Flights</h3>
                            </div>
                            <div className="grid gap-4">
                                {mergeFlights(flights).map((flight: any, idx: number) => (
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

                                        {/* Optional: Show Travelers for this specific flight if needed, but user wanted less grouping. */}
                                        {/* Maybe just show a small list of travelers on the flight card? */}
                                        {/* For now, leaving it out as requested "remove grouping", assuming flat list is paramount.
                                           Actually, showing WHO is on the flight might still be useful if it varies.
                                           The merging logic preserves `travelers` array. */}
                                        {flight.travelers && flight.travelers.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                                                <User className="h-3 w-3 text-white/40" />
                                                <span className="text-xs text-white/60">
                                                    {flight.travelers.map((t: any) => {
                                                        const val = typeof t === 'string' ? t : t.name;
                                                        return getTravelerName({ name: val });
                                                    }).join(", ")}
                                                </span>
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

                    {/* Activities Section */}
                    {activities.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-6 opacity-70">
                                <Activity className="h-5 w-5" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Activities</h3>
                            </div>
                            <div className="grid gap-4">
                                {activities.map((activity: any, idx: number) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-serif text-xl mb-1">{activity.title}</p>
                                                {activity.description && activity.description !== "Manual Entry" && (
                                                    <p className="text-sm text-white/60">{activity.description}</p>
                                                )}
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

                                                {/* Remove Button (Hover only) - Auth only */}
                                                {!isPublicView && (
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
                                                )}
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


                    {/* Bottom Actions - Auth Protected */}
                    {isAuthenticated && (
                        <div className="flex justify-center items-center gap-4 mt-4 mb-8">
                            <button
                                onClick={() => setIsDebugModalOpen(true)}
                                className="text-white/30 hover:text-purple-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full"
                            >
                                <Terminal className="h-4 w-4" />
                                Debug Info
                            </button>
                        </div>
                    )}

                </div>

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    title="Delete Trip"
                    message={`Are you sure you want to PERMANENTLY delete the trip to ${trip.destination}? This cannot be undone.`}
                    confirmLabel="Delete Forever"
                    onConfirm={handleDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    isDestructive={true}
                />

                {/* Custom Cancel Trip Modal */}
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4 text-amber-500">
                                    <div className="p-3 bg-amber-500/10 rounded-full">
                                        <Layers className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Archive & Track Credits</h3>
                                </div>

                                <p className="text-white/60 text-sm mb-6">
                                    Cancelling this trip will move it to your <b>Cancelled / Credit</b> archive.
                                    Record your flight credits below so you can track them for future use.
                                </p>

                                {trip.travelers && trip.travelers.length > 0 && (
                                    <div className="mb-6 bg-black/20 rounded-xl p-4 border border-white/5">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">
                                            Flight Credits
                                        </h4>

                                        {/* Total / Evenly Logic */}
                                        <div className="mb-4 space-y-2">
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10 focus-within:border-white/30 transition-colors">
                                                <span className="text-white/30 text-xs">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Total Credit Amount"
                                                    value={totalCancelCredit}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTotalCancelCredit(val);
                                                        // Distribute if checked
                                                        if (applyCreditEvenly && val) {
                                                            const total = parseFloat(val);
                                                            if (!isNaN(total)) {
                                                                const share = total / trip.travelers.length;
                                                                const newCredits: Record<string, number> = {};
                                                                trip.travelers.forEach((t: any) => {
                                                                    newCredits[t.id || t.name] = Math.floor(share * 100) / 100; // 2 decimal
                                                                });
                                                                setCancelCredits(newCredits);
                                                            }
                                                        } else if (applyCreditEvenly && !val) {
                                                            // Clear if total cleared
                                                            setCancelCredits({});
                                                        }
                                                    }}
                                                    className="w-full bg-transparent text-white text-sm focus:outline-none font-medium"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${applyCreditEvenly ? 'bg-amber-500 border-amber-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                                    {applyCreditEvenly && <Check className="w-3 h-3 text-black" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={applyCreditEvenly}
                                                    onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setApplyCreditEvenly(isChecked);
                                                        if (isChecked && totalCancelCredit) {
                                                            // Re-distribute
                                                            const total = parseFloat(totalCancelCredit);
                                                            if (!isNaN(total)) {
                                                                const share = total / trip.travelers.length;
                                                                const newCredits: Record<string, number> = {};
                                                                trip.travelers.forEach((t: any) => {
                                                                    newCredits[t.id || t.name] = Math.floor(share * 100) / 100;
                                                                });
                                                                setCancelCredits(newCredits);
                                                            }
                                                        }
                                                    }}
                                                />
                                                <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">Apply evenly for all passengers</span>
                                            </label>
                                        </div>

                                        <div className="space-y-3 pl-2 border-l-2 border-white/5">
                                            {/* Show breakdown only if Manual Distribution */}
                                            {!applyCreditEvenly && trip.travelers.map((t: any) => {
                                                const key = t.id || t.name;
                                                return (
                                                    <div key={key} className="flex items-center justify-between">
                                                        <span className="text-sm text-white/80">{t.name}</span>
                                                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10 focus-within:border-white/30 transition-colors">
                                                            <span className="text-white/30 text-xs">$</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                value={cancelCredits[key] || ""}
                                                                onChange={(e) => {
                                                                    handleCreditChange(key, e.target.value)
                                                                }}
                                                                className="w-20 bg-transparent text-white text-right text-sm focus:outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Validation Warning */}
                                        {isAllocationMismatch && (
                                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center justify-between">
                                                <span>Allocation mismatch!</span>
                                                <span className="font-mono font-bold">${currentAllocated.toLocaleString()} vs ${totalInput.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Expiration Date */}
                                <div className="mb-6">
                                    <label className="block text-xs uppercase text-white/40 font-bold tracking-widest mb-2">
                                        Expiration Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
                                        value={creditExpirationDate}
                                        onChange={(e) => setCreditExpirationDate(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-colors bg-white/5 hover:bg-white/10 text-white"
                                    >
                                        Keep Trip
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="flex-1 px-4 py-3 rounded-xl font-medium text-sm transition-colors bg-amber-500 hover:bg-amber-400 text-black"
                                    >
                                        Update Trip Record
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Source Documents Modal - Logic Restored */}
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
                                    {(() => {
                                        // Re-calculate docs here as it was local scope before
                                        const docs = [];
                                        if (trip.sourceDocuments && Array.isArray(trip.sourceDocuments)) {
                                            docs.push(...trip.sourceDocuments);
                                        } else if (trip.sourceDocument) {
                                            docs.push({ url: trip.sourceDocument, name: trip.sourceFileName || "Source Document" });
                                        }

                                        if (docs.length === 0) {
                                            return <div className="text-white/40 text-center py-4">No source documents available.</div>;
                                        }

                                        return docs.map((doc: any, idx: number) => (
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
                                                    <Copy className="h-4 w-4 rotate-180" />
                                                </div>
                                            </a>
                                        ));
                                    })()}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                <EditTripModal
                    isOpen={isEditTripModalOpen}
                    onClose={() => setIsEditTripModalOpen(false)}
                    trip={trip}
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

            </div>
        </div>
    );
}
