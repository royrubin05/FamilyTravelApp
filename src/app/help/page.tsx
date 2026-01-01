"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Map,
    Mail,
    Upload,
    PlusCircle,
    Users,
    Settings,
    Shield,
    Globe,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Search,
    CreditCard
} from "lucide-react";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { checkSession } from "@/app/auth-actions";

export default function HelpPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkSession()
            .then((valid) => setIsLoggedIn(valid))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-blue-500/30 pb-20">
            <GlobalHeader hideGlobalActions={!isLoggedIn}>
                {!isLoggedIn && !isLoading && (
                    <Link
                        href="/login-v2"
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
                    >
                        Login
                    </Link>
                )}
            </GlobalHeader>

            <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Map className="w-3 h-3" />
                        User Guide
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">
                        How to use <span className="text-white/40">Travel Roots</span>
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
                        Your central hub for family adventures. Learn how to automate your itinerary, manage travelers, and share your journey.
                    </p>
                </motion.div>

                {/* 1. Getting Started */}
                <section className="mb-20">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <Users className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold">Getting Started</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="group bg-white/5 border border-white/5 p-8 rounded-2xl hover:bg-white/10 transition-colors">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-white/40" />
                                Family Identity
                            </h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-4">
                                Go to <span className="font-bold text-white">Settings</span> to add your family members.
                            </p>
                            <div className="bg-black/40 rounded-lg p-4 text-xs text-white/70 font-mono border border-white/5">
                                <span className="text-green-400">Tip:</span> Add nicknames! This helps our AI automatically identifying travelers in your emails (e.g., "Dad", "Mom").
                            </div>
                        </div>

                        <div className="group bg-white/5 border border-white/5 p-8 rounded-2xl hover:bg-white/10 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-white/40" />
                                Linked Emails
                            </h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-4">
                                Add your personal email addresses in <span className="font-bold text-white">Settings &gt; Linked Emails</span>.
                            </p>
                            <p className="text-white/60 text-sm">
                                This authorizes you to forward trips from these accounts directly to your dashboard.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 2. Adding Trips */}
                <section className="mb-20">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                            <PlusCircle className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold">Three Ways to Add Trips</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Method A */}
                        <div className="bg-gradient-to-b from-emerald-900/10 to-transparent border border-emerald-500/20 p-6 rounded-2xl relative group">
                            <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                                Recommended
                            </div>
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                                <Mail className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-emerald-100">Email Forwarding</h3>
                            <p className="text-sm text-white/60 mb-6 min-h-[40px]">
                                Simply forward your confirmation emails to:
                            </p>
                            <div className="bg-black/60 p-3 rounded-lg border border-emerald-500/20 flex items-center gap-2 group/copy cursor-pointer hover:border-emerald-500/40 transition-colors"
                                onClick={() => navigator.clipboard.writeText("mytravelroot@gmail.com")}>
                                <span className="font-mono text-xs text-emerald-400 truncate">mytravelroot@gmail.com</span>
                            </div>
                        </div>

                        {/* Method B */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 mb-6">
                                <Upload className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">File Upload</h3>
                            <p className="text-sm text-white/60 mb-4">
                                Have a PDF or .eml file?
                            </p>
                            <ol className="text-sm text-white/50 space-y-2 list-decimal list-inside">
                                <li>Click <span className="text-white font-bold">Trip Actions (+)</span></li>
                                <li>Select <span className="text-white">Import PDF / EML</span></li>
                                <li>Drag & Drop your file</li>
                            </ol>
                        </div>

                        {/* Method C */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/70 mb-6">
                                <Map className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Manual Entry</h3>
                            <p className="text-sm text-white/60 mb-4">
                                For simple road trips or custom plans.
                            </p>
                            <ol className="text-sm text-white/50 space-y-2 list-decimal list-inside">
                                <li>Click <span className="text-white font-bold">Trip Actions (+)</span></li>
                                <li>Select <span className="text-white">Add Trip Manually</span></li>
                                <li>Enter Location & Dates</li>
                            </ol>
                        </div>
                    </div>
                </section>

                {/* 3. Dashboard Features */}
                <section className="mb-20">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <Map className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold">Dashboard Power Features</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="group bg-white/5 border border-white/5 p-6 rounded-xl hover:bg-white/10 transition-colors flex gap-6 items-start">
                            <div className="p-3 bg-white/5 rounded-lg text-white/60 group-hover:text-white group-hover:bg-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                                <Search className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Traveler Filtering</h3>
                                <p className="text-sm text-white/60">
                                    Tap a family member's name (e.g., "Dad") at the top of the dashboard to see <span className="italic text-white/80">only</span> the trips they are on.
                                </p>
                            </div>
                        </div>

                        <div className="group bg-white/5 border border-white/5 p-6 rounded-xl hover:bg-white/10 transition-colors flex gap-6 items-start">
                            <div className="p-3 bg-white/5 rounded-lg text-white/60 group-hover:text-white group-hover:bg-blue-500 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">Flight Credits & Cancellations</h3>
                                <p className="text-sm text-white/60">
                                    Don't delete cancelled trips! Archive them using the <span className="text-white font-bold">Cancel Trip</span> option. We'll track your flight credits and expiration dates so you never lose money on efficient vouchers.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Sharing */}
                <section className="mb-20">
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/10 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-full mb-6">
                                <Globe className="w-8 h-8 text-blue-300" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold mb-4">Share Your Journey</h2>
                            <p className="text-lg text-white/70 mb-8">
                                Share read-only itineraries with friends or extended family.
                            </p>
                            <div className="flex flex-col md:flex-row justify-center gap-4 text-left">
                                <div className="bg-black/40 border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">1</div>
                                    <span className="text-sm">Open any Trip or Group</span>
                                </div>
                                <div className="bg-black/40 border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">2</div>
                                    <span className="text-sm">Click "Share" & Toggle Public</span>
                                </div>
                                <div className="bg-black/40 border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">3</div>
                                    <span className="text-sm">Copy the secure link</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <div className="text-center pb-8 border-t border-white/10 pt-12">
                    <p className="text-white/30 text-sm mb-4">
                        FamilyTravelApp &middot; Built with ❤️ for the Rubin Family
                    </p>
                    <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white font-bold text-sm transition-colors">
                        Go to Dashboard <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
