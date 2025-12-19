"use client";

import { X, Image as ImageIcon, Layout, Loader2, Upload, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CityImageManager } from "./CityImageManager";
import { useState, useRef } from "react";
import { uploadBackgroundImage, removeBackgroundImage } from "@/app/settings-actions";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentImages: Record<string, string>;
    currentSettings: { backgroundImage: string | null };
    onUpdateSettings: (newSettings: any) => void;
}

export function SettingsModal({ isOpen, onClose, currentImages, onUpdateImage, currentSettings, onUpdateSettings }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<"images" | "appearance">("images");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const result = await uploadBackgroundImage(formData);
            if (result.success && result.imagePath) {
                onUpdateSettings({ ...currentSettings, backgroundImage: result.imagePath });
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveBackground = async () => {
        setIsUploading(true);
        try {
            await removeBackgroundImage();
            onUpdateSettings({ ...currentSettings, backgroundImage: null });
        } catch (error) {
            console.error("Remove failed", error);
        } finally {
            setIsUploading(false);
        }
    };

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
                        <button
                            onClick={() => setActiveSection("appearance")}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "appearance"
                                ? "bg-white/10 text-white"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Layout className="h-4 w-4" />
                            Appearance
                        </button>
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

                        {activeSection === "appearance" && (
                            <div className="p-8 max-w-2xl">
                                <h3 className="text-xl font-serif mb-6">Dashboard Appearance</h3>

                                <div className="space-y-6">
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-6">
                                        <h4 className="text-sm font-bold uppercase tracking-widest text-white/70 mb-4">Background Image</h4>

                                        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10 mb-4 bg-neutral-950 group">
                                            {currentSettings?.backgroundImage ? (
                                                <img
                                                    src={currentSettings.backgroundImage}
                                                    alt="Dashboard Background"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                                                    <p className="text-white/30 text-sm">Default Dark Theme</p>
                                                </div>
                                            )}

                                            {/* Overlay for loading */}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleBackgroundUpload}
                                            />

                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-2"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Upload New Image
                                            </button>

                                            {currentSettings?.backgroundImage && (
                                                <button
                                                    onClick={handleRemoveBackground}
                                                    disabled={isUploading}
                                                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-bold rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Reset to Default
                                                </button>
                                            )}
                                        </div>
                                        <p className="mt-3 text-xs text-white/40">
                                            Recommended size: 1920x1080 or larger. Supported formats: JPG, PNG, WebP.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
