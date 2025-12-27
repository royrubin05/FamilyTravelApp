"use client";

import { useState, useEffect } from "react";
// Remove deprecated server action
// import { loginAction } from "@/app/actions";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import { createSession } from "@/app/auth-actions";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LogIn, X } from "lucide-react";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setError("");
            setUsername("");
            setPassword("");
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // 1. Sanitize Input
            let cleanUsername = username.trim();
            let email = cleanUsername;

            // If input does not look like an email, append internal domain
            if (!cleanUsername.includes("@")) {
                email = `${cleanUsername}@travelroots.internal`;
            }

            // 2. Client-Side Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            // 3. Exchange Token for Session Cookie
            const result = await createSession(idToken);

            if (result.success) {
                // Force hard reload to update middleware state and load dashboard
                window.location.href = "/";
            } else {
                setError("Session creation failed.");
            }
        } catch (err: any) {
            console.error("Login failed:", err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
                setError("Invalid username or password.");
            } else {
                setError(`Error: ${err.message || "Something went wrong"}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900 border border-white/10 p-8 rounded-2xl shadow-2xl z-10"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex justify-center mb-6">
                            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                                <Lock className="h-6 w-6 text-amber-500" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-serif text-center text-white mb-2">Welcome Back</h2>
                        <p className="text-center text-white/40 text-sm mb-8">Enter your credentials to access your dashboard.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                                    placeholder="e.g. rubin_family"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                                    placeholder="••••••"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded border border-red-500/20">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black font-bold uppercase tracking-wider py-3 rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                            >
                                {isLoading ? "Verifying..." : (
                                    <>
                                        <LogIn className="h-4 w-4" /> Login
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

