"use client";

import { motion } from "framer-motion";
import { QrCode, Plane, Hotel, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartCardProps {
    data: any;
    isExpanded: boolean;
    onTap: () => void;
}

export function SmartCard({ data, isExpanded, onTap }: SmartCardProps) {
    const Icon = data.type === 'flight' ? Plane : data.type === 'hotel' ? Hotel : Ticket;

    return (
        <motion.div
            layout
            onClick={onTap}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
                "bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl overflow-hidden cursor-pointer w-full max-w-sm mx-auto",
                isExpanded ? "rounded-3xl h-[60vh]" : "rounded-[2rem] h-48"
            )}
        >
            <motion.div layout className="p-8 h-full flex flex-col relative">
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                    <motion.span layout className="text-sm font-medium tracking-widest uppercase opacity-70">
                        {data.type}
                    </motion.span>
                    <Icon className="h-5 w-5 opacity-70" />
                </div>

                {/* Main Content */}
                <motion.h2 layout className="text-4xl font-bold mb-2 tracking-tight">
                    {data.title}
                </motion.h2>
                <motion.p layout className="text-lg opacity-80 mb-6 font-light">
                    {data.subtitle}
                </motion.p>

                {/* Status Line - Always Visible */}
                <motion.div layout className="mt-auto">
                    <div className="h-px w-full bg-white/20 mb-4" />
                    <div className="flex justify-between items-center">
                        <span className="font-semibold">{data.status}</span>
                        {data.qrCode && <QrCode className="h-6 w-6" />}
                    </div>
                </motion.div>

                {/* Expanded Content (Only visible when expanded) */}
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute top-32 left-8 right-8"
                    >
                        <div className="grid grid-cols-2 gap-8 my-8">
                            <div>
                                <p className="text-xs uppercase opacity-50 mb-1">Detail</p>
                                <p className="text-2xl font-mono">{data.detail1}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase opacity-50 mb-1">Detail</p>
                                <p className="text-2xl font-mono">{data.detail2}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase opacity-50 mb-1">Class</p>
                                <p className="text-xl">Business</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase opacity-50 mb-1">Seat</p>
                                <p className="text-xl">2A</p>
                            </div>
                        </div>

                        <div className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-8">
                            Add to Wallet
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
}
