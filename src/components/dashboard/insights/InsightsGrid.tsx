"use client";

import { motion } from "framer-motion";
import { Globe, Plane, Bed, Map as MapIcon, Trophy, PlaneTakeoff } from "lucide-react";

interface InsightsGridProps {
    stats: {
        totalMiles: number;
        totalHours: number;
        hotelCount: number;
        countryCount: number;
        topAirline: { name: string; count: number };
        topDestination: { name: string; count: number };
    };
}

export function InsightsGrid({ stats }: InsightsGridProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, scale: 0.9 },
        show: { opacity: 1, scale: 1 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
            {/* 1. Countries (Wide) */}
            <motion.div variants={item} className="col-span-2 bg-gradient-to-br from-blue-900/40 to-blue-950/40 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group min-h-[160px]">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className="h-5 w-5 text-blue-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-300/60">Global Reach</span>
                        </div>
                        <h3 className="text-5xl font-serif text-white mb-1 drop-shadow-lg">{stats.countryCount}</h3>
                        <p className="text-sm text-blue-200/60">Countries Visited</p>
                    </div>
                </div>
                {/* Visual Decorative */}
                <MapIcon className="absolute -right-8 -bottom-8 h-48 w-48 text-blue-500/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </motion.div>

            {/* 2. Miles (Square) */}
            <motion.div variants={item} className="col-span-1 bg-neutral-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-2xl font-bold text-white mb-1">{stats.totalMiles.toLocaleString()}</h3>
                <p className="text-xs text-white/50 uppercase tracking-wider">Miles Flown</p>
                <PlaneTakeoff className="absolute top-4 right-4 h-8 w-8 text-neutral-800 group-hover:text-purple-500/50 transition-colors" />
            </motion.div>

            {/* 3. Hours (Square) */}
            <motion.div variants={item} className="col-span-1 bg-neutral-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group flex flex-col justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-2xl font-bold text-white mb-1">{stats.totalHours}</h3>
                <p className="text-xs text-white/50 uppercase tracking-wider">Hours in Air</p>
                <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-amber-500/50" />
            </motion.div>

            {/* 4. Hotels & Top Destination (Wide) */}
            <motion.div variants={item} className="col-span-2 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group min-h-[160px]">
                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Bed className="h-5 w-5 text-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300/60">Hospitality</span>
                        </div>
                        <h3 className="text-4xl font-serif text-white mb-1">{stats.hotelCount}</h3>
                        <p className="text-sm text-indigo-200/60">Hotel Stays</p>
                    </div>
                    <div className="md:border-l md:border-white/10 md:pl-8">
                        <div className="flex items-center gap-2 mb-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            <span className="text-xs font-bold uppercase tracking-widest text-yellow-500/60">Top Spot</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">{stats.topDestination.name}</h3>
                        <p className="text-sm text-white/40">Visited {stats.topDestination.count} times</p>
                    </div>
                </div>
            </motion.div>

            {/* 5. Top Airline (Tall/End) */}
            <motion.div variants={item} className="col-span-2 md:col-span-2 bg-neutral-900/50 border border-white/10 rounded-3xl p-6 relative overflow-hidden group flex items-center justify-between">
                <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Most Flown Airline</p>
                    <h3 className="text-xl font-bold text-white">{stats.topAirline.name}</h3>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-serif text-white/20 group-hover:text-white/80 transition-colors">{stats.topAirline.count}</span>
                    <span className="text-xs text-white/20 block">Flights</span>
                </div>
            </motion.div>
        </motion.div>
    );
}
