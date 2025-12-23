"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { saveTripGroup } from "@/app/trip-actions";

interface EditGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: any;
    allTrips: any[];
}

export default function EditGroupModal({ isOpen, onClose, group, allTrips }: EditGroupModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(group.ids || []));
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const toggleTrip = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update the group with new IDs
            // We ideally should also re-calculate start/end dates based on new selection
            // But for now, we just update IDs and let the user (or a separate helper) handle dates?
            // Actually, best strictly to re-calculate dates here.

            const selectedTrips = allTrips.filter(t => selectedIds.has(t.id));
            const sortedTrips = selectedTrips.sort((a, b) => {
                const da = new Date(a.dates).getTime() || 0;
                const db = new Date(b.dates).getTime() || 0;
                return da - db;
            });

            const startDate = sortedTrips.length > 0 ? sortedTrips[0].dates : group.startDate;
            const endDate = sortedTrips.length > 0 ? sortedTrips[sortedTrips.length - 1].dates : group.endDate;

            const updatedGroup = {
                ...group,
                ids: Array.from(selectedIds),
                startDate,
                endDate
            };

            await saveTripGroup(updatedGroup);
            window.location.reload(); // Reload to show changes
        } catch (error) {
            console.error("Failed to update group", error);
            alert("Failed to update group");
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-serif text-white">Edit Trip Group</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="h-5 w-5 text-white/60" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-sm text-white/60 mb-4">Select trips to include in this group:</p>
                    {allTrips.map(trip => {
                        const isSelected = selectedIds.has(trip.id);
                        return (
                            <div
                                key={trip.id}
                                onClick={() => toggleTrip(trip.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected
                                        ? "bg-blue-500/10 border-blue-500/50"
                                        : "bg-white/5 border-white/5 hover:border-white/20"
                                    }`}
                            >
                                <div>
                                    <div className="font-bold text-white">{trip.destination}</div>
                                    <div className="text-xs text-white/50">{trip.dates}</div>
                                </div>
                                {isSelected && (
                                    <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
