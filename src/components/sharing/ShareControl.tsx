"use client";

import { useState } from "react";
import { Share2, Check, Lock, Globe, Copy, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { togglePublicAccess } from "@/app/public-share-actions";

interface ShareControlProps {
    type: 'trip' | 'group';
    id: string;
    initialIsPublic?: boolean;
    initialShareToken?: string;
}

export function ShareControl({ type, id, initialIsPublic = false, initialShareToken }: ShareControlProps) {
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const [shareToken, setShareToken] = useState(initialShareToken);
    const [isLoading, setIsLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const handleToggle = async () => {
        setIsLoading(true);
        const newState = !isPublic;

        try {
            const result = await togglePublicAccess(type, id, newState);
            if (result.success) {
                setIsPublic(newState);
                if (result.shareToken) {
                    setShareToken(result.shareToken);
                }
            } else {
                console.error("Failed to toggle public access:", result.error);
                // Revert state if needed or show error toast
            }
        } catch (error) {
            console.error("Error toggling:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (!shareToken) return;

        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/share/${type}/${shareToken}`;

        navigator.clipboard.writeText(shareUrl);

        const msg = type === 'group'
            ? "Link copied. All associated trips are now publicly available."
            : "Link copied to clipboard.";

        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="flex items-center gap-2 relative">

            {/* Toggle Switch */}
            <div className="flex items-center gap-2 mr-2">
                <span className={`text-xs font-bold uppercase tracking-widest ${isPublic ? 'text-green-400' : 'text-white/40'}`}>
                    {isPublic ? 'Public' : 'Private'}
                </span>
                <button
                    onClick={handleToggle}
                    disabled={isLoading}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${isPublic ? 'bg-green-500' : 'bg-white/20'}`}
                    title={isPublic ? "Make Private" : "Make Public"}
                >
                    <motion.div
                        initial={false}
                        animate={{ x: isPublic ? 20 : 2 }}
                        className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                </button>
            </div>

            {/* Share Button - Always visible but disabled if private */}
            <motion.button
                layout
                onClick={isPublic ? handleCopyLink : undefined}
                className={`p-1.5 rounded-lg transition-colors border flex items-center justify-center ${isPublic
                    ? "bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 border-blue-500/30 cursor-pointer"
                    : "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                    }`}
                title={isPublic ? "Copy Public Link" : "Enable Public Access to share"}
                whileTap={isPublic ? { scale: 0.95 } : undefined}
            >
                <Share2 className="h-4 w-4" />
            </motion.button>


            {/* Toast Notification - Popover Style */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full mb-3 right-0 bg-neutral-900 border border-white/10 text-white px-3 py-2 rounded-lg shadow-xl flex items-center gap-2 z-[100] whitespace-nowrap"
                    >
                        <Check className="h-3 w-3 text-green-400" />
                        <span className="text-xs font-medium">{toastMessage}</span>
                        {/* Triangle pointer */}
                        <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-neutral-900 border-r border-b border-white/10 rotate-45"></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
