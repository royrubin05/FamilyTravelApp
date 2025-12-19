"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users } from "lucide-react";

interface TripListItemProps {
    id: string;
    destination: string;
    dates: string;
    image: string;
    travelerCount: number;
}

export function TripListItem({ id, destination, dates, image, travelerCount }: TripListItemProps) {
    // Mock status logic for demo
    const isUpcoming = id === "aspen" || id === "paris";
    const status = isUpcoming ? "Upcoming" : "Completed";
    const statusColor = isUpcoming ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50";

    return (
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
                        src={image || "/placeholder.jpg"}
                        alt={destination}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('fallback-icon');
                        }}
                        className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <span className="text-xs font-serif text-white/30">{destination.substring(0, 2)}</span>
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
                    <div className="hidden md:flex items-center gap-2 text-sm text-white/60">
                        <Users className="h-4 w-4 opacity-50" />
                        <span>{travelerCount} Travelers</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-end md:justify-start">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${statusColor}`}>
                            {status}
                        </span>
                    </div>
                </div>

                {/* Action Icon */}
                <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </motion.div>
        </Link>
    );
}
