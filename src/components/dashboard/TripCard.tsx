"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface TripCardProps {
    id: string;
    destination: string;
    dates: string;
    image: string;
}

export function TripCard({ id, destination, dates, image }: TripCardProps) {
    return (
        <Link href={`/trip?id=${id}`}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl cursor-pointer group"
            >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors z-10" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-20" />

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={image}
                    alt={destination}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                <div className="absolute bottom-6 left-6 right-6 z-30">
                    <h3 className="text-3xl font-serif text-white tracking-wide mb-2">{destination}</h3>
                    <p className="text-xs font-sans text-white/80 uppercase tracking-widest">{dates}</p>
                </div>
            </motion.div>
        </Link>
    );
}
