"use client";

import { useState } from "react";
import { createFamily } from "@/app/admin/actions";

export default function CreateFamilyForm() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setMessage("");

        const res = await createFamily(formData);

        setLoading(false);
        if (res.success) {
            setIsOpen(false);
            setMessage("Family created successfully!");
            // Reset form? relying on native reset for now or reload
        } else {
            setMessage(res.error || "Failed to create family");
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-900/20"
            >
                + Create New Family
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4 text-white">Create New Family</h2>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Display Name</label>
                        <input
                            name="displayName"
                            type="text"
                            required
                            placeholder="e.g. The Doe Family"
                            className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-neutral-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Account Email (Optional)</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="e.g. real.email@example.com"
                            className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-neutral-500"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Used for password reset. If empty, uses username@travelroots.internal.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Username Prefix</label>
                        <div className="flex items-center">
                            <input
                                name="username"
                                type="text"
                                required
                                placeholder="doe_family"
                                className="flex-1 p-2 bg-neutral-800 border border-neutral-700 rounded-l-lg outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-neutral-500 border-r-0"
                            />
                            <span className="bg-neutral-800 text-neutral-400 px-3 py-2 border border-neutral-700 rounded-r-lg text-sm">
                                @travelroots.internal
                            </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">This will be their login username.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Initial Password</label>
                        <input
                            name="password"
                            type="text"
                            required
                            defaultValue="welcome123!"
                            className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-white"
                        />
                    </div>

                    {message && <p className="text-red-400 text-sm">{message}</p>}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? "Creating..." : "Create Family"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
