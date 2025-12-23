"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Share2, Check, LayoutDashboard, Layers, Plane, Component, ChevronLeft } from "lucide-react";
import EditGroupModal from "./EditGroupModal";
import { TripListItem } from "@/components/dashboard/TripListItem";
import { motion } from "framer-motion";
import { deleteTripGroupAction } from "@/app/trip-actions";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface GroupContentProps {
    group: any;
    trips: any[]; // The sub-trips belonging to this group
    allTrips?: any[]; // All available trips for editing
    initialImages: Record<string, string>;
    isAuthenticated?: boolean;
}

export default function GroupContent({ group, trips, allTrips = [], initialImages, isAuthenticated = false }: GroupContentProps) {
    const [isShared, setIsShared] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (!group) return <div>Group not found</div>;

    // Helper to get formatted date
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
    };

    const handleDeleteGroup = async () => {
        // Optimistic UI or wait? Wait is safer for generic actions.
        await deleteTripGroupAction(group.id);
        window.location.href = "/";
    };

    return (
        <div className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white/30 pb-20">

            {/* Background Image Layer */}
            <div className="fixed inset-0 z-0">
                {group.image && (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={group.image}
                            alt={group.title}
                            className="w-full h-full object-cover opacity-50"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                    </>
                )}
            </div>

            {/* Top Navigation */}
            <div className="relative z-50 p-6 flex justify-between items-center">
                <div className="p-2 -ml-2">
                    {isAuthenticated ? (
                        <Link href="/" className="opacity-80 hover:opacity-100 transition-opacity bg-black/20 rounded-full backdrop-blur-md p-2 block">
                            <Home className="h-6 w-6" />
                        </Link>
                    ) : (
                        <div className="w-10 h-10" /> /* Spacer if no home button */
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-3 py-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md border border-white/10 transition-all text-white/80 hover:text-white"
                        title="Share Trip Group"
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
                        <span className="text-xs uppercase tracking-widest font-bold">
                            {formatDate(group.startDate)} — {formatDate(group.endDate)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 px-6 pt-10">
                {/* Header */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-20 text-center relative">
                    <div className="flex items-center justify-center gap-2 text-blue-400 mb-4 opacity-80">
                        <Layers className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Trip Group</span>
                    </div>
                    <h1 className="text-[10vw] md:text-[6vw] font-serif leading-none tracking-tighter mix-blend-overlay">
                        {group.title}
                    </h1>
                </motion.div>

                {/* Timeline / Itinerary Feed */}
                <div className="max-w-3xl mx-auto space-y-0">
                    {trips.map((trip, index) => {
                        const isLast = index === trips.length - 1;

                        return (
                            <div key={trip.id} className="relative pl-8 md:pl-10 pb-12">
                                {/* Timeline Line */}
                                {!isLast && (
                                    <div className="absolute left-[11px] md:left-[19px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-blue-900 to-transparent opacity-50" />
                                )}

                                {/* Connector Node */}
                                <div className="absolute left-0 md:left-2 top-2 h-6 w-6 rounded-full bg-black border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20 flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                                </div>

                                {/* Header for this Leg */}
                                <div className="mb-4 pt-1">
                                    <h2 className="text-2xl font-serif text-white flex items-center gap-3">
                                        {trip.destination}
                                    </h2>
                                    <p className="text-sm text-white/50 pl-0 mt-1 uppercase tracking-wider">
                                        {formatDate(trip.dates)}
                                    </p>
                                </div>

                                {/* Expanded Card */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

                                    {/* Flights Summary */}
                                    {trip.flights && trip.flights.length > 0 && (
                                        <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-3 text-blue-300 opacity-80">
                                                <Plane className="h-4 w-4" />
                                                <h3 className="text-xs font-bold uppercase tracking-widest">Flights</h3>
                                            </div>
                                            <div className="space-y-3">
                                                {trip.flights.map((f: any, i: number) => (
                                                    <div key={i} className="bg-black/20 rounded-lg p-4 border border-white/5">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="text-lg font-serif">{f.airline}</div>
                                                                <div className="text-xs text-white/50">{f.flightNumber}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-mono text-white/80">{f.departureTime}</div>
                                                                <div className="text-xs text-white/40">{f.departureAirport} → {f.arrivalAirport}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hotels Summary */}
                                    {trip.hotels && trip.hotels.length > 0 && (
                                        <div className="mb-6">
                                            <div className="flex items-center gap-2 mb-3 text-amber-300 opacity-80">
                                                <Component className="h-4 w-4" />
                                                <h3 className="text-xs font-bold uppercase tracking-widest">Hotels</h3>
                                            </div>
                                            <div className="space-y-3">
                                                {trip.hotels.map((h: any, i: number) => (
                                                    <div key={i} className="bg-black/20 rounded-lg p-4 border border-white/5">
                                                        <div className="text-base font-medium">{h.name}</div>
                                                        <div className="text-xs text-white/50">{h.address}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Fallback */}
                                    {!trip.flights?.length && !trip.hotels?.length && (
                                        <p className="text-white/40 italic">No specific reservation details available.</p>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <Link
                                            href={`/trip?id=${trip.id}`}
                                            className="text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition-colors flex items-center gap-2"
                                        >
                                            View Full Trip Details <ChevronLeft className="h-3 w-3 rotate-180" />
                                        </Link>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                {isAuthenticated && (
                    <div className="flex justify-center items-center gap-4 mt-8 mb-8 border-t border-white/10 pt-8 max-w-lg mx-auto">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 px-6 py-3 rounded-full border border-white/10"
                        >
                            <span className="hidden sm:inline">Edit Group</span>
                            <span className="sm:hidden">Edit</span>
                        </button>
                        <button
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="text-red-400/80 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 px-6 py-3 hover:bg-red-500/10 rounded-full border border-transparent hover:border-red-500/20"
                        >
                            Ungroup
                        </button>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Ungroup Trips"
                message="Are you sure you want to ungroup these trips? The individual trips will remain in your dashboard."
                confirmLabel="Ungroup"
                onConfirm={handleDeleteGroup}
                onCancel={() => setIsDeleteModalOpen(false)}
                isDestructive={true}
            />

            <EditGroupModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                group={group}
                allTrips={allTrips}
            />
        </div>
    );
}
