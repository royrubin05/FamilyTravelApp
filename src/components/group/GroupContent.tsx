"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, Share2, Check, LayoutDashboard, Layers, Plane, Component, ChevronLeft, ArrowUp, ArrowDown, Users, GripVertical } from "lucide-react";
import EditGroupModal from "./EditGroupModal";
import { motion } from "framer-motion";
import { deleteTripGroupAction, reorderTripGroup } from "@/app/trip-actions";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { parseTripDate } from "@/lib/dateUtils";
import { getTripRouteTitle } from "@/lib/tripUtils";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    MouseSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GroupContentProps {
    group: any;
    trips: any[]; // The sub-trips belonging to this group
    allTrips?: any[]; // All available trips for editing
    initialImages: Record<string, string>;
    isAuthenticated?: boolean;
    backgroundImage?: string | null;
}

// Separate component for the sortable trip item to encapsulate hooks
function SortableTripItem({ trip, index, isLast, isAuthenticated, formatDate }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: trip.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.8 : 1,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative pl-0 md:pl-10 pb-12">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[3px] md:left-[19px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-blue-900 to-transparent opacity-50" />
            )}

            {/* Connector Node - acts as drag handle area visual anchor */}
            <div className="absolute left-[-8px] md:left-2 top-2 h-6 w-6 rounded-full bg-black border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
            </div>

            <div className={`pl-8 md:pl-0 ${isDragging ? 'scale-[1.02]' : ''} transition-transform`}>
                {/* Header for this Leg */}
                <div className="mb-4 pt-1 flex items-center justify-between group/header">
                    <div>
                        <h2 className="text-2xl font-serif text-white flex items-center gap-3">
                            {trip.activities?.[0]?.title || trip.trip_title_dashboard || getTripRouteTitle(trip)}
                        </h2>
                        <div className="text-sm text-white/50 pl-0 mt-1 uppercase tracking-wider flex items-center gap-2">
                            {trip.activities?.[0]?.title && (
                                <>
                                    <span>{trip.trip_title_dashboard || getTripRouteTitle(trip)}</span>
                                    <span className="opacity-50">•</span>
                                </>
                            )}
                            <span>{formatDate(trip.dates)}</span>
                        </div>
                    </div>

                    {/* Drag Handle */}
                    {isAuthenticated && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing text-white/30 hover:text-white transition-colors touch-none"
                            title="Drag to reorder"
                        >
                            <GripVertical className="h-5 w-5" />
                        </div>
                    )}
                </div>

                {/* Expanded Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

                    {/* Travelers Summary */}
                    {trip.travelers && trip.travelers.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3 text-emerald-300 opacity-80">
                                <Users className="h-4 w-4" />
                                <h3 className="text-xs font-bold uppercase tracking-widest">Travelers</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {trip.travelers.map((t: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-black/20 rounded-full pl-1 pr-3 py-1 border border-white/5">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
                                            {(t.name || t).charAt(0)}
                                        </div>
                                        <span className="text-sm text-white/80">{t.name || t}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
        </div>
    );
}

export default function GroupContent({ group, trips, allTrips = [], initialImages, isAuthenticated = false, backgroundImage }: GroupContentProps) {
    const [isShared, setIsShared] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [orderedTrips, setOrderedTrips] = useState(trips);

    if (!group) return <div>Group not found</div>;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor) // explicitly enabling touch
    );

    // Helper to get formatted date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        if (dateStr.includes("-")) {
            return dateStr;
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Calculate overall group date range dynamically from trips
    const getGroupDateRange = () => {
        if (!orderedTrips.length) return "No Dates";

        const sortedByDate = [...orderedTrips].sort((a, b) => {
            const dateA = a.dates ? parseTripDate(a.dates) : 0;
            const dateB = b.dates ? parseTripDate(b.dates) : 0;
            return dateA - dateB;
        });

        const firstTrip = sortedByDate[0];
        const lastTrip = sortedByDate[sortedByDate.length - 1];

        const start = firstTrip.dates?.split("-")[0]?.trim();
        const end = lastTrip.dates?.split("-")[1]?.trim() || lastTrip.dates?.split("-")[0]?.trim();

        if (start && end) return `${start} — ${end}`;
        return group.startDate && group.endDate ? `${formatDate(group.startDate)} — ${formatDate(group.endDate)}` : "Dates TBD";
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setOrderedTrips((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                // Save to server
                const newIds = newItems.map(t => t.id);
                reorderTripGroup(group.id, newIds);

                return newItems;
            });
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
    };

    const handleDeleteGroup = async () => {
        await deleteTripGroupAction(group.id);
        window.location.href = "/";
    };

    return (
        <div className="relative min-h-screen w-full bg-black text-white font-sans selection:bg-white/30 pb-20">

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
                    group.image && (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={group.image}
                                alt={group.title}
                                className="w-full h-full object-cover opacity-50"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                        </>
                    )
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
                            {getGroupDateRange()}
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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={orderedTrips.map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {orderedTrips.map((trip, index) => (
                                <SortableTripItem
                                    key={trip.id}
                                    trip={trip}
                                    index={index}
                                    isLast={index === orderedTrips.length - 1}
                                    isAuthenticated={isAuthenticated}
                                    formatDate={formatDate}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
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
