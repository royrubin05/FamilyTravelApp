"use client";

import { X, Share2 } from "lucide-react";
import { ShareControl } from "@/components/sharing/ShareControl";

interface ShareGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    group: any;
}

export default function ShareGroupModal({ isOpen, onClose, group }: ShareGroupModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">

                <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-serif text-white">Share Group</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="h-5 w-5 text-white/60" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-blue-400">
                                <Share2 className="h-4 w-4" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">Public Sharing</h3>
                            </div>
                            <ShareControl
                                type="group"
                                id={group.id}
                                initialIsPublic={group.isPublic}
                                initialShareToken={group.shareToken}
                            />
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">
                            Share this group itinerary with others. The link will provide read-only access to all trips in this group.
                        </p>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
