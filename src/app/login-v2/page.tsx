"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import { createSession } from "@/app/auth-actions";
import Image from "next/image";

export default function LoginV2Page() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // 1. Sanitize Input
            let cleanUsername = username.trim();
            let email = cleanUsername;

            // If input does not look like an email, append internal domain
            if (!cleanUsername.includes("@")) {
                email = `${cleanUsername}@travelroots.internal`;
            }

            console.log("Attempting login with:", email);

            // 2. Client-Side Login
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await userCredential.user.getIdToken();

            // 3. Exchange Token for Session Cookie
            const result = await createSession(idToken);

            if (result.success) {
                // Redirect to dashboard
                router.push("/");
            } else {
                setError("Session creation failed.");
            }
        } catch (err: any) {
            console.error("Login failed:", err);
            if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
                setError("Invalid username or password.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)]" />
                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="w-full max-w-sm bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="relative h-16 w-full mb-6 flex justify-center">
                        {/* Use brightness-0 invert if the logo is black, or just standard if it's already white adapted. 
                             Assuming v3 is colored/white or we force white via filter. */}
                        <Image
                            src="/images/travelroots-logo-v3.png"
                            alt="TravelRoots"
                            width={180}
                            height={60}
                            className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                            priority
                        />
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-serif text-white tracking-wide">Welcome Back</h1>
                        <p className="text-sm text-white/40 mt-1">Sign in to access your family trips</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 uppercase tracking-widest pl-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-white/30 text-white placeholder:text-white/20 outline-none transition-all"
                            placeholder="e.g. rubin_family"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 uppercase tracking-widest pl-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/20 focus:border-white/30 text-white placeholder:text-white/20 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-white/20 font-mono">SECURE • ENCRYPTED • PRIVATE</p>
            </div>
        </div>
    );
}
