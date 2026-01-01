"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase-config";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle, AlertTriangle } from "lucide-react";

export default function ResetPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const finalEmail = email.includes("@") ? email : `${email}@travelroots.internal`;
            await sendPasswordResetEmail(auth, finalEmail);
            setStatus("success");
            setMessage(`Password reset email sent to ${finalEmail}. Check your inbox.`);
        } catch (error: any) {
            console.error("Reset Error:", error);
            setStatus("error");
            if (error.code === 'auth/user-not-found') {
                setMessage("No account found with this email.");
            } else {
                setMessage("Failed to send reset email. Please try again.");
            }
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
                <div className="mb-6">
                    <Link href="/login-v2" className="text-white/40 hover:text-white flex items-center gap-2 text-sm transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" /> Back to Login
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                    <p className="text-white/40 text-sm mt-1">Enter your email to receive recovery instructions.</p>
                </div>

                {status === "success" ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                        <div className="mx-auto h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                        </div>
                        <h3 className="text-white font-medium mb-2">Check your inbox</h3>
                        <p className="text-green-400/80 text-sm">{message}</p>
                        <Link href="/login-v2" className="block mt-4 text-sm text-white font-bold bg-white/10 hover:bg-white/20 py-2 rounded-lg transition-colors">
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-white/20" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-neutral-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        {status === "error" && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-300 text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === "loading"}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                        >
                            {status === "loading" ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
