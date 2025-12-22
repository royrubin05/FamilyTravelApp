"use client";

import { motion } from "framer-motion";
import { ChevronRight, Layers } from "lucide-react";

interface TripGroupCardProps {
    group: any;
    tripCount: number;
    onClick: () => void;
}

export function TripGroupCard({ group, tripCount, onClick }: TripGroupCardProps) {
    return (
        <div onClick={onClick} className="relative group cursor-pointer perspective-1000">
            {/* Stack Effect Layers */}
            <div className="absolute top-2 left-2 right-2 h-full bg-white/5 rounded-2xl border border-white/5 transform translate-y-2 scale-[0.95] z-0" />
            <div className="absolute top-1 left-1 right-1 h-full bg-white/10 rounded-2xl border border-white/10 transform translate-y-1 scale-[0.98] z-10" />

            {/* Main Card */}
            <div className="relative z-20 h-[180px] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl transition-transform duration-300 group-hover:-translate-y-1">
                {/* Background Image */}
                <div className="absolute inset-0">
                    {group.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={group.image}
                            alt={group.title}
                            className="h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-md mb-3">
                                <Layers className="h-3 w-3 text-blue-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                                    Trip Group • {tripCount} Stops
                                </span>
                            </div>
                            <h3 className="text-3xl font-serif font-medium text-white mb-1 shadow-black drop-shadow-lg">
                                {group.title}
                            </h3>
                            <p className="text-sm font-medium text-white/70 tracking-wide uppercase">
                                {group.startDate} — {group.endDate}
                            </p>
                        </div>

                        <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-white/20 transition-colors border border-white/10">
                            <ChevronRight className="h-5 w-5 text-white/80" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
