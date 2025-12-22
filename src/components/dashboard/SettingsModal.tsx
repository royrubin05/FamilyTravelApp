"use client";

import { X, Image as ImageIcon, Layout, Loader2, Upload, Trash2, User, Edit2, AlertTriangle, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CityImageManager } from "./CityImageManager";
import { DataAuditManager } from "./DataAuditManager";
import { useState, useRef } from "react";
import { uploadBackgroundImage, removeBackgroundImage } from "@/app/settings-actions";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentImages: Record<string, string>;
    currentSettings: { backgroundImage: string | null };
    onUpdateSettings: (newSettings: any) => void;
    onUpdateImage: (city: string, url: string) => void;
}

export function SettingsModal({ isOpen, onClose, currentImages, onUpdateImage, currentSettings, onUpdateSettings }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<"images" | "appearance" | "members" | "audit">("images");
    const [isUploading, setIsUploading] = useState(false);
    const [newMemberName, setNewMemberName] = useState("");
    const [newMemberNickname, setNewMemberNickname] = useState("");
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
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

    const handleSaveMember = async () => {
        if (!newMemberName.trim()) return;

        // Split nicknames by comma and clean up
        const nicknameParams = newMemberNickname
            .split(',')
            .map(n => n.trim())
            .filter(n => n.length > 0);

        const currentMembers = (currentSettings as any).familyMembers || [];

        let newSettings;

        if (editingMemberId) {
            // Updating existing member
            const updatedMembers = currentMembers.map((m: any) => {
                if (m.id === editingMemberId) {
                    return {
                        ...m,
                        name: newMemberName,
                        nicknames: nicknameParams.length > 0 ? nicknameParams : undefined,
                        // remove old single nickname field if present
                        nickname: undefined
                    };
                }
                return m;
            });

            newSettings = {
                ...currentSettings,
                familyMembers: updatedMembers
            };
        } else {
            // Adding new member
            const id = newMemberName.toLowerCase().replace(/\s+/g, '-');
            const newMember = {
                id,
                name: newMemberName,
                nicknames: nicknameParams.length > 0 ? nicknameParams : undefined,
                role: "Traveler"
            };

            // Prevent duplicates (only for new members)
            if (currentMembers.some((m: any) => m.id === id)) {
                alert("Member already exists");
                return;
            }

            newSettings = {
                ...currentSettings,
                familyMembers: [...currentMembers, newMember]
            };
        }

        try {
            // Optimistic update
            onUpdateSettings(newSettings);
            setNewMemberName("");
            setNewMemberNickname("");
            setEditingMemberId(null);

            // Persist
            const { updateSettings } = await import("@/app/settings-actions");
            await updateSettings(newSettings);
        } catch (error) {
            console.error("Failed to save member", error);
        }
    };

    const handleEditMember = (member: any) => {
        setEditingMemberId(member.id);
        setNewMemberName(member.name);
        setNewMemberNickname(member.nicknames ? member.nicknames.join(", ") : (member.nickname || ""));
    };

    const handleCancelEdit = () => {
        setEditingMemberId(null);
        setNewMemberName("");
        setNewMemberNickname("");
    };

    const handleRemoveMember = async (id: string) => {
        if (editingMemberId === id) {
            handleCancelEdit();
        }

        const currentMembers = (currentSettings as any).familyMembers || [];
        const newSettings = {
            ...currentSettings,
            familyMembers: currentMembers.filter((m: any) => m.id !== id)
        };

        try {
            onUpdateSettings(newSettings);
            const { updateSettings } = await import("@/app/settings-actions");
            await updateSettings(newSettings);
        } catch (error) {
            console.error("Failed to remove member", error);
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
                        <button
                            onClick={() => setActiveSection("members")}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "members"
                                ? "bg-white/10 text-white"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <User className="h-4 w-4" />
                            Family Members
                        </button>


                        <div className="h-px bg-white/10 my-2 mx-3" />
                        <button
                            onClick={() => setActiveSection("audit")}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === "audit"
                                ? "bg-amber-500/20 text-amber-500"
                                : "text-white/50 hover:text-amber-500 hover:bg-amber-500/10"
                                }`}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Data Audit
                        </button>

                        <div className="flex-1" /> {/* Spacer */}

                        <div className="h-px bg-white/10 my-2 mx-3" />
                        <button
                            onClick={async () => {
                                const { logoutAction } = await import("@/app/actions");
                                await logoutAction();
                                window.location.href = "/login";
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors group"
                        >
                            <LogOut className="h-4 w-4 group-hover:text-red-400" />
                            Sign Out
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

                        {activeSection === "members" && (
                            <div className="p-8 max-w-2xl">
                                <h3 className="text-xl font-serif mb-6">Family Members</h3>

                                <div className="space-y-6">
                                    <div className="bg-black/20 border border-white/5 rounded-xl p-6">
                                        <div className="flex flex-col gap-3 mb-6">
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={newMemberName}
                                                    onChange={(e) => setNewMemberName(e.target.value)}
                                                    placeholder="Full Name (e.g. Roee)"
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
                                                />
                                                <input
                                                    type="text"
                                                    value={newMemberNickname}
                                                    onChange={(e) => setNewMemberNickname(e.target.value)}
                                                    placeholder="Nicknames (comma separated)"
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveMember}
                                                    disabled={!newMemberName.trim()}
                                                    className={`flex-1 px-4 py-2 font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${editingMemberId
                                                        ? "bg-amber-500 text-black hover:bg-amber-400"
                                                        : "bg-white text-black hover:bg-neutral-200"
                                                        }`}
                                                >
                                                    {editingMemberId ? "Update Member" : "Add Member"}
                                                </button>
                                                {editingMemberId && (
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-4 py-2 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {((currentSettings as any).familyMembers || []).map((member: any) => (
                                                <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group hover:bg-white/10 transition-colors relative">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/70">
                                                            {(member.nicknames?.[0] || member.nickname || member.name).charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-baseline gap-2">
                                                                <p className="text-sm font-medium text-white">{member.name}</p>
                                                                {(member.nicknames?.length > 0 || member.nickname) && (
                                                                    <span className="text-xs text-white/50">
                                                                        ({member.nicknames ? member.nicknames.join(", ") : member.nickname})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-wider">{member.role}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditMember(member)}
                                                            className="p-2 text-white/40 hover:text-white transition-colors"
                                                            title="Edit member"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRemoveMember(member.id)}
                                                            className="p-2 text-white/40 hover:text-red-400 transition-colors"
                                                            title="Remove member"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {(!currentSettings as any).familyMembers?.length && (
                                                <div className="text-center py-8 text-white/30 text-sm">
                                                    No family members added yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "audit" && (
                            <div className="h-full">
                                <DataAuditManager />
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
