"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Plus, Settings, Check, Share2, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import { UploadTripModal } from "@/components/dashboard/UploadTripModal";
import { ManualTripModal } from "@/components/dashboard/ManualTripModal";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { getSettings } from "@/app/settings-actions";

interface GlobalHeaderProps {
    children?: React.ReactNode;
    className?: string;
    hideGlobalActions?: boolean; // Option to hide global actions if needed (e.g. login page)
}

export function GlobalHeader({ children, className = "", hideGlobalActions = false }: GlobalHeaderProps) {
    const router = useRouter();

    // Modal States
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // Data State
    const [settings, setSettings] = useState<any>(null);

    // Fetch settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await getSettings();
                setSettings(data);
            } catch (err) {
                console.error("Failed to load settings in header:", err);
            }
        }
        loadSettings();
    }, []);

    const handleUpdateSettings = (newSettings: any) => {
        setSettings(newSettings);
        router.refresh();
    };

    const handleUploadComplete = () => {
        router.refresh();
        // Optional: add toast or notification
    };

    const familyMembers = settings?.familyMembers || [];

    return (
        <>
            <header className={`flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center mb-10 max-w-5xl mx-auto relative z-40 px-4 md:px-0 ${className}`}>
                {/* Logo - Resized Larger */}
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <div className="relative h-16 w-64 md:h-20 md:w-72">
                        <Image
                            src="/images/travelroots-logo.png"
                            alt="TravelRoots"
                            fill
                            className="object-contain object-left"
                            priority
                            sizes="(max-width: 768px) 100vw, 300px"
                        />
                    </div>
                </Link>

                <div className="flex items-center gap-3">
                    {/* Page-Specific Actions (passed as children) */}
                    {children}

                    {/* Global Actions */}
                    {!hideGlobalActions && (
                        <>
                            <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />

                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5"
                                title="Settings"
                            >
                                <Settings className="h-5 w-5" />
                            </button>

                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsActionsOpen(!isActionsOpen); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors shadow-lg shadow-white/5"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden md:inline">Trip Actions</span>
                                </button>

                                <AnimatePresence>
                                    {isActionsOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="absolute right-0 top-full mt-2 w-56 bg-white text-black rounded-xl shadow-2xl overflow-hidden z-50 py-1 border border-neutral-200"
                                        >
                                            <button
                                                onClick={() => { setIsUploadModalOpen(true); setIsActionsOpen(false); }}
                                                className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-100 flex items-center gap-2"
                                            >
                                                Import PDF / EML
                                            </button>
                                            <button
                                                onClick={() => { setIsManualModalOpen(true); setIsActionsOpen(false); }}
                                                className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-100 flex items-center gap-2 border-t border-neutral-100"
                                            >
                                                Add Trip Manually
                                            </button>
                                            <Link
                                                href="/"
                                                onClick={() => setIsActionsOpen(false)}
                                                className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-neutral-100 flex items-center gap-2 border-t border-neutral-100 text-neutral-500"
                                            >
                                                Create Trip Group (Select on Dashboard)
                                            </Link>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Global Modals */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentSettings={settings || {}}
                onUpdateSettings={handleUpdateSettings}
            />

            <UploadTripModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadComplete={handleUploadComplete}
            />

            <ManualTripModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onComplete={handleUploadComplete}
                familyMembers={familyMembers}
            />
        </>
    );
}
