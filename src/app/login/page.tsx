"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions";
import { motion } from "framer-motion";
import { Lock, LogIn } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await loginAction(email, password);
            if (!result.success) {
                setError(result.error || "Invalid credentials");
            } else {
                // Force hard reload to update middleware state
                window.location.href = "/";
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 bg-[url('/london.jpg')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md bg-zinc-900/80 border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-md"
            >
                <div className="flex justify-center mb-6">
                    <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <Lock className="h-6 w-6 text-amber-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-serif text-center text-white mb-2">Welcome Back</h1>
                <p className="text-center text-white/40 text-sm mb-8">Enter your credentials to access the family dashboard.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-white/50 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="name@example.com"
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
    );
}
