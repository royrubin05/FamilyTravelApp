"use client";

import { ShareControl } from "@/components/sharing/ShareControl";
import { X, Share2, Layers } from "lucide-react";

interface EditTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: any;
}

export default function EditTripModal({ isOpen, onClose, trip }: EditTripModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-serif text-white">Trip Settings</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="h-5 w-5 text-white/60" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Sharing Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-blue-400">
                            <Share2 className="h-5 w-5" />
                            <h3 className="text-sm font-bold uppercase tracking-widest">Public Sharing</h3>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                            <p className="text-sm text-white/60 mb-6 leading-relaxed">
                                Share this trip with family and friends. Anyone with the link can view the itinerary.
                            </p>

                            <div className="flex justify-between items-center">
                                <span className="text-white font-medium">Public Access</span>
                                <ShareControl
                                    type="trip"
                                    id={trip.id}
                                    initialIsPublic={trip.isPublic}
                                    initialShareToken={trip.shareToken}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-black rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors"
                    >
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
}
