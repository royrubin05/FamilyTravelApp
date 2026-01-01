"use client";

import { useRef } from "react";
import { Sparkles, CreditCard, CheckSquare, Calendar, Users } from "lucide-react";
import { motion } from "framer-motion";

interface DualRowFiltersProps {
    statusTab: "upcoming" | "completed" | "map" | "insights" | "cancelled";
    setStatusTab: (tab: "upcoming" | "completed" | "map" | "insights" | "cancelled") => void;
    filter: string;
    setFilter: (id: string) => void;
    familyMembers: any[];
    enableInsights: boolean;
}

export function DualRowFilters({
    statusTab,
    setStatusTab,
    filter,
    setFilter,
    familyMembers,
    enableInsights,
}: DualRowFiltersProps) {

    const handleVibrate = () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    const statusOptions = [
        { id: "upcoming", label: "Upcoming", icon: Calendar },
        { id: "completed", label: "Completed", icon: CheckSquare },
        { id: "cancelled", label: "Cancelled / Credit", icon: CreditCard },
    ];

    if (enableInsights) {
        statusOptions.push({ id: "insights", label: "Insights", icon: Sparkles });
    }

    const travelerOptions = [
        { id: "all", label: "All Travelers" },
        ...familyMembers.map((m) => ({ id: m.id, label: m.name })),
    ];

    return (
        <>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="md:hidden w-[calc(100%+32px)] -ml-4 flex flex-col gap-4 py-2 relative mb-8">
                {/* Row 1: Status Filters */}
                <div className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
                    <div className="flex gap-3 px-4 min-w-max">
                        {statusOptions.map((option) => {
                            const isActive = statusTab === option.id;
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        handleVibrate();
                                        setStatusTab(option.id as any);
                                    }}
                                    className={`
                  snap-center shrink-0 flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all duration-300
                  min-h-[44px] text-sm font-bold tracking-wide backdrop-blur-md
                  ${isActive
                                            ? "bg-teal-500/20 border-teal-400/30 text-teal-100 shadow-[0_0_15px_rgba(20,184,166,0.5),0_0_30px_rgba(20,184,166,0.2)]"
                                            : "bg-black/20 border-white/10 text-white/70 hover:bg-black/40 hover:border-white/20"
                                        }
                `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? "text-teal-200" : "text-white/50"}`} />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Row 2: Traveler Filters */}
                <div className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
                    <div className="flex gap-2 px-4 min-w-max items-center">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/5 mr-1 shrink-0">
                            <Users className="w-3.5 h-3.5 text-white/30" />
                        </div>

                        {travelerOptions.map((option) => {
                            const isActive = filter === option.id;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        handleVibrate();
                                        setFilter(option.id);
                                    }}
                                    className={`
                  snap-center shrink-0 px-5 py-2.5 rounded-full border transition-all duration-300
                  min-h-[44px] text-xs font-bold uppercase tracking-wider backdrop-blur-md
                  ${isActive
                                            ? "bg-teal-500/20 border-teal-400/30 text-teal-100 shadow-[0_0_15px_rgba(20,184,166,0.5),0_0_30px_rgba(20,184,166,0.2)]"
                                            : "bg-black/20 border-white/10 text-white/60 hover:bg-black/40 hover:border-white/20"
                                        }
                `}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
