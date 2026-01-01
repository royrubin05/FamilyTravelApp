"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { Plus, Settings, Check, Share2, Layers, X, FileUp, PlusCircle, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

import { UploadTripModal } from "@/components/dashboard/UploadTripModal";
import { ManualTripModal } from "@/components/dashboard/ManualTripModal";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { getSettings } from "@/app/settings-actions";

interface MenuItem {
    label?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
    className?: string;
    type?: 'action' | 'separator' | 'custom';
    content?: React.ReactNode;
}

interface GlobalHeaderProps {
    children?: React.ReactNode;
    className?: string;
    hideGlobalActions?: boolean;
    additionalMenuItems?: MenuItem[];
}

export interface GlobalHeaderRef {
    openSettings: () => void;
}

export const GlobalHeader = forwardRef<GlobalHeaderRef, GlobalHeaderProps>(({ children, className = "", hideGlobalActions = false, additionalMenuItems = [] }, ref) => {
    const router = useRouter();



    // Modal States
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Data State
    const [settings, setSettings] = useState<any>(null);

    const actionsRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        openSettings: () => setIsSettingsOpen(true)
    }));

    // Click outside handler for Trip Actions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setIsActionsOpen(false);
            }
        }

        if (isActionsOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isActionsOpen]);

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
            <header className={`flex flex-row justify-between items-center mb-4 pt-4 max-w-4xl mx-auto relative z-40 ${className}`}>
                <div className="flex items-center gap-3">
                    {/* Logo */}
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <div className="relative h-12 w-[165px] md:h-20 md:w-[275px]">
                            <Image
                                src="/images/travelroots-logo-v3.png"
                                alt="TravelRoots"
                                fill
                                className="object-contain object-left"
                                priority
                                sizes="(max-width: 768px) 165px, 275px"
                            />
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-2">
                    {/* ... existing right side actions ... */}
                    {children}

                    {/* Global Actions */}
                    {!hideGlobalActions && (
                        <>
                            <div className="h-6 w-px bg-white/10 hidden md:block" />
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5 flex items-center justify-center"
                                title="Settings"
                            >
                                <Settings className="h-5 w-5" />
                            </button>
                            <Link
                                href="/help"
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5 flex items-center justify-center"
                                title="Help & User Guide"
                            >
                                <HelpCircle className="h-5 w-5" />
                            </Link>
                            <div className="relative" ref={actionsRef}>
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
                                            className="absolute right-0 top-full mt-2 w-64 bg-white text-black rounded-xl shadow-2xl overflow-hidden z-50 py-1 border border-neutral-200"
                                        >
                                            <button
                                                onClick={() => { setIsUploadModalOpen(true); setIsActionsOpen(false); }}
                                                className="w-full text-left px-4 py-4 text-sm font-medium hover:bg-neutral-100 flex items-center gap-3"
                                            >
                                                <FileUp className="w-4 h-4" />
                                                Import PDF / EML
                                            </button>
                                            <button
                                                onClick={() => { setIsManualModalOpen(true); setIsActionsOpen(false); }}
                                                className="w-full text-left px-4 py-4 text-sm font-medium hover:bg-neutral-100 flex items-center gap-3 border-t border-neutral-100"
                                            >
                                                <PlusCircle className="w-4 h-4" />
                                                Add Trip Manually
                                            </button>
                                            {additionalMenuItems.map((item, index) => {
                                                if (item.type === 'separator') {
                                                    return <div key={index} className="h-px bg-neutral-100 my-1" />;
                                                }
                                                if (item.type === 'custom') {
                                                    return <div key={index}>{item.content}</div>;
                                                }
                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => { item.onClick?.(); setIsActionsOpen(false); }}
                                                        className={`w-full text-left px-4 py-4 text-sm font-medium hover:bg-neutral-100 flex items-center gap-3 border-t border-neutral-100 ${item.className || "text-neutral-800"}`}
                                                    >
                                                        {item.icon}
                                                        {item.label}
                                                    </button>
                                                );
                                            })}
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
});

GlobalHeader.displayName = "GlobalHeader";
