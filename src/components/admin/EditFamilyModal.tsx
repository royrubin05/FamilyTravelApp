"use client";

import { useState, useEffect } from "react";
import { updateFamily, FamilyUser } from "@/app/admin/actions";
import { X } from "lucide-react";

interface EditFamilyModalProps {
    family: FamilyUser | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateSuccess: () => void;
}

export default function EditFamilyModal({ family, isOpen, onClose, onUpdateSuccess }: EditFamilyModalProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // Reset message when opening/changing family
    useEffect(() => {
        setMessage("");
    }, [isOpen, family]);

    async function handleSubmit(formData: FormData) {
        if (!family) return;

        setLoading(true);
        setMessage("");

        const displayName = formData.get("displayName") as string;
        const password = formData.get("password") as string;

        const res = await updateFamily(family.uid, { displayName, password });

        setLoading(false);
        if (res.success) {
            onUpdateSuccess();
            onClose();
        } else {
            setMessage(res.error || "Failed to update family");
        }
    }

    if (!isOpen || !family) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">Edit Family</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form action={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Username (Read Only)</label>
                            <div className="p-2 border border-white/10 bg-white/5 rounded-lg text-neutral-500 text-sm font-mono">
                                {family.username}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Display Name</label>
                            <input
                                name="displayName"
                                type="text"
                                required
                                defaultValue={family.displayName}
                                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Reset Password</label>
                            <input
                                name="password"
                                type="text"
                                placeholder="Leave empty to keep current"
                                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-white transition-all"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Only enter a value if you want to change the password.</p>
                        </div>

                        {message && (
                            <div className="p-3 bg-red-500/10 text-red-400 text-sm rounded-lg border border-red-500/20">
                                {message}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-neutral-400 hover:text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
