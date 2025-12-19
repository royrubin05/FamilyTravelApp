"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRIPS } from "@/lib/data";
import { SmartCard } from "@/components/journey/SmartCard";
import { User, AlignLeft, Home } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function TripContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");
    const router = useRouter();

    const tripIndex = TRIPS.findIndex((t) => t.id === id);
    const trip = TRIPS[tripIndex] || TRIPS[0];

    const [activeMemberIndex, setActiveMemberIndex] = useState(0);
    const [isCardExpanded, setIsCardExpanded] = useState(false);

    useEffect(() => {
        setActiveMemberIndex(0);
        setIsCardExpanded(false);
    }, [id]);

    const members = trip.travelers.length > 0 ? trip.travelers : [{ id: 'empty', name: 'Explore', card: null }];
    const member = members[activeMemberIndex];

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black text-white font-sans selection:bg-white/30">

            {/* Background Image Layer */}
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 z-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-10" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={trip.image} alt={trip.destination} className="h-full w-full object-cover" />
                </motion.div>
            </AnimatePresence>

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-center">
                <Link href="/" className="opacity-80 hover:opacity-100 transition-opacity p-2 -ml-2">
                    <Home className="h-8 w-8" />
                </Link>

                <div className="flex gap-2">
                    {TRIPS.map((t) => (
                        <Link
                            key={t.id}
                            href={`/trip?id=${t.id}`}
                            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${t.id === trip.id ? 'w-8 bg-white' : 'w-1.5 bg-white/30'}`}
                            style={{ minHeight: '6px' }} // Ensure visibility
                        />
                    ))}
                </div>
                <User className="h-8 w-8 opacity-80 cursor-pointer p-1" />
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 h-full flex flex-col justify-end pb-12 px-6">

                {/* Destination Title */}
                {!isCardExpanded && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 text-center">
                        <h1 className="text-[15vw] font-serif leading-none tracking-tighter opacity-90 mix-blend-overlay">
                            {trip.destination}
                        </h1>
                        <p className="text-sm uppercase tracking-[0.3em] opacity-80 mt-2">{trip.dates}</p>
                    </motion.div>
                )}

                {/* Member/Context Switcher */}
                {trip.travelers.length > 0 && !isCardExpanded && (
                    <div className="flex justify-center gap-8 mb-6 overflow-x-auto py-2 no-scrollbar">
                        {trip.travelers.map((m, i) => (
                            <button
                                key={m.id}
                                onClick={() => setActiveMemberIndex(i)}
                                className={`relative text-sm font-medium uppercase tracking-widest transition-all duration-300 ${i === activeMemberIndex ? 'text-white scale-110' : 'text-white/40'}`}
                            >
                                {m.name}
                                {i === activeMemberIndex && (
                                    <motion.div layoutId="active-dot" className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-1 bg-white rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Smart Card */}
                {member.card ? (
                    <div className="w-full flex justify-center perspective-1000">
                        <SmartCard
                            data={member.card}
                            isExpanded={isCardExpanded}
                            onTap={() => setIsCardExpanded(!isCardExpanded)}
                        />
                    </div>
                ) : (
                    <div className="text-center pb-12 opacity-50">
                        <p>No itinerary details available.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
