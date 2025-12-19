"use client";

import { X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CityImageManager } from "./CityImageManager";
import { useState } from "react";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentImages: Record<string, string>;
    onUpdateImage: (city: string, url: string) => void;
}

export function SettingsModal({ isOpen, onClose, currentImages, onUpdateImage }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<"images" | "general">("images");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-4xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden h-[80vh] flex flex-col md:flex-row"
            >
                {/* Sidebar */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-serif text-white px-2">Settings</h2>
                        <button onClick={onClose} className="md:hidden p-1 text-white/50 hover:text-white">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <button
                            onClick={() => setActiveSection("images")}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "images"
                                    ? "bg-white/10 text-white"
                                    : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <ImageIcon className="h-4 w-4" />
                            City Images
                        </button>
                        {/* Future settings can go here */}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-neutral-900/50 relative">
                    <button
                        onClick={onClose}
                        className="hidden md:block absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white z-10"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex-1 overflow-y-auto">
                        {activeSection === "images" && (
                            <CityImageManager
                                isOpen={true}
                                onClose={() => { }} // Controlled by parent modal
                                initialImages={currentImages}
                                onUpdate={onUpdateImage}
                                embedded={true}
                            />
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
