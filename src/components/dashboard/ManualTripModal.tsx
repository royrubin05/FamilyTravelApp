"use client";

import { useState } from "react";
import { X, Check, Loader2, Calendar, MapPin, Activity, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createManualTrip } from "@/app/trip-actions";

interface ManualTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    familyMembers: { id: string; name: string }[];
}

export function ManualTripModal({ isOpen, onClose, onComplete, familyMembers }: ManualTripModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        destination: "",
        activityName: "",
        dates: "",
        selectedTravelers: new Set<string>()
    });

    const toggleTraveler = (name: string) => {
        const newSet = new Set(formData.selectedTravelers);
        if (newSet.has(name)) {
            newSet.delete(name);
        } else {
            newSet.add(name);
        }
        setFormData({ ...formData, selectedTravelers: newSet });
    };

    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    // ... (keep toggleTraveler)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.destination || !dateRange.start || !dateRange.end) return;

        // Format dates into string "MMM D - MMM D, YYYY"
        // Parse manually to avoid UTC conversion issues (e.g., "2025-03-30" becoming "Mar 29" in PST)
        const [sYear, sMonth, sDay] = dateRange.start.split('-').map(Number);
        const [eYear, eMonth, eDay] = dateRange.end.split('-').map(Number);

        const startObj = new Date(sYear, sMonth - 1, sDay);
        const endObj = new Date(eYear, eMonth - 1, eDay);

        // Simple formatting: "Dec 25 - Jan 01, 2025"
        // Note: Input date is YYYY-MM-DD (local time/UTC depending on browser). 
        // We'll treat the string "2024-12-25" as the date description.
        // Let's format it nicely for the string display.
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const startStr = startObj.toLocaleDateString('en-US', options);
        const endStr = endObj.toLocaleDateString('en-US', options);
        const year = endObj.getFullYear();

        const finalDateString = `${startStr} - ${endStr}, ${year}`;

        setIsLoading(true);
        try {
            // @ts-ignore
            const result = await createManualTrip({
                destination: formData.destination,
                dates: finalDateString,
                activityName: formData.activityName,
                travelers: Array.from(formData.selectedTravelers)
            });

            if (result.success) {
                setFormData({
                    destination: "",
                    activityName: "",
                    dates: "",
                    selectedTravelers: new Set()
                });
                setDateRange({ start: "", end: "" });
                onComplete();
                onClose();
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to create trip.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85dvh] overflow-y-auto"
            >
                {/* ... (keep header and button) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-serif text-white tracking-wide">Add Manual Trip</h2>
                    <p className="text-sm text-white/50 mt-1">Create a trip entry without a document.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Destination ... (keep existing) */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-white/60 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Location
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Paris"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                            value={formData.destination}
                            onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                            required
                        />
                    </div>

                    {/* Dates Range */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-white/60 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Dates
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors [color-scheme:dark]"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                required
                            />
                            <input
                                type="date"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors [color-scheme:dark]"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Activity ... (keep existing) */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-white/60 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Activity Name (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Eiffel Tower Tour"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                            value={formData.activityName}
                            onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                        />
                    </div>

                    {/* Travelers ... (keep existing) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-white/60 flex items-center gap-2">
                            <Users className="w-3 h-3" /> Travelers
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {familyMembers.map((member) => {
                                const isSelected = formData.selectedTravelers.has(member.name);
                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => toggleTraveler(member.name)}
                                        className={`cursor-pointer flex items-center p-2 rounded-lg border transition-all ${isSelected
                                            ? "bg-blue-600/20 border-blue-500/50 text-white"
                                            : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                                            }`}
                                    >
                                        <div className={`w-4 h-4 mr-2 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-400 bg-blue-400" : "border-white/30"
                                            }`}>
                                            {isSelected && <Check className="w-3 h-3 text-black" />}
                                        </div>
                                        <span className="text-xs font-medium">{member.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !formData.destination || !dateRange.start || !dateRange.end}
                        className="w-full py-3 bg-white text-black font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {isLoading ? "Creating..." : "Create Trip"}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
