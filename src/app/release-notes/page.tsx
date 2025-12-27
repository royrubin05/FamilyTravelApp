"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Layers,
    Share2,
    CreditCard,
    BarChart3,
    Smartphone,
    Check,
    ArrowRight,
    Sparkles,
    Users,
    Globe,
    Calendar
} from "lucide-react";
import { GlobalHeader } from "@/components/ui/GlobalHeader";

export default function ReleaseNotesPage() {
    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-amber-500/30">
            {/* Header for non-logged in users acts as branding */}
            <div className="max-w-4xl mx-auto pt-8 px-4">
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <div className="relative h-12 w-[165px] md:h-16 md:w-[220px]">
                            <Image
                                src="/images/travelroots-logo-v3.png"
                                alt="TravelRoots"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </Link>
                    <Link
                        href="/login-v2"
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors"
                    >
                        Login
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4 mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        What's New
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-white leading-tight">
                        Release Notes <span className="text-white/20">& Updates</span>
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl leading-relaxed">
                        Discover the latest features, improvements, and tools designed to make your group travel planning seamless and beautiful.
                    </p>
                </motion.div>

                {/* Release: v2.2.0 */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24 relative pl-8 border-l border-white/10"
                >
                    {/* Timeline Dot */}
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />

                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-8">
                        <h2 className="text-2xl font-bold text-white">Version 2.2</h2>
                        <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/20" />
                        <div className="inline-flex items-center gap-2 text-white/40 font-mono text-sm uppercase tracking-wider">
                            <Calendar className="w-4 h-4" />
                            December 27, 2025
                        </div>
                    </div>

                    {/* Feature Spotlight: Public Sharing */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-white/10 p-8 md:p-12 mb-12">
                        {/* Background Decoration */}
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 blur-[100px] -translate-y-1/2 -translate-x-1/2 rounded-full" />

                        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm">
                                    <Globe className="w-4 h-4" />
                                    Major Update
                                </div>
                                <h3 className="text-3xl font-bold text-white">Public Sharing</h3>
                                <p className="text-white/70 leading-relaxed text-lg">
                                    Share your adventures with the world (or just Grandma). You can now generate secure, public read-only links for any Trip or Trip Group.
                                </p>

                                <ul className="space-y-4">
                                    <li className="flex gap-3">
                                        <div className="min-w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                            <Share2 className="w-3 h-3 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">One-Click Sharing</h4>
                                            <p className="text-white/50 text-sm">Toggle "Public Access" on any trip to instantly create a shareable link.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="min-w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                            <Layers className="w-3 h-3 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Group Sharing</h4>
                                            <p className="text-white/50 text-sm">Share entire collections of trips with a single URL. Perfect for sharing a full year's itinerary.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Visual Representation */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 relative shadow-2xl skew-y-1 transform transition-transform hover:skew-y-0 duration-500">
                                <div className="absolute inset-0 bg-blue-500/5 rounded-2xl" />
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-mono text-white/60">LIVE LINK</span>
                                    </div>
                                    <Share2 className="w-4 h-4 text-white/40" />
                                </div>

                                <div className="space-y-3">
                                    <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                                    <div className="h-3 w-1/2 bg-white/5 rounded" />
                                    <div className="mt-6 flex gap-2">
                                        <div className="h-20 w-32 bg-white/5 rounded-lg border border-white/5" />
                                        <div className="h-20 w-32 bg-white/5 rounded-lg border border-white/5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Insights Improvements */}
                        <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-6 rounded-2xl transition-all">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Smarter Insights</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                The Insights tab now intelligently handles "Current Year" defaults and hides future trips from your stats until they happen.
                            </p>
                        </div>

                        {/* UI Refinements */}
                        <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-6 rounded-2xl transition-all">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                                <Check className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Refined Group Management</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Separated "Edit" and "Share" modes for Groups. The Edit modal now automatically filters out completed trips and sorts by date for easier planning.
                            </p>
                        </div>
                    </div>
                </motion.section>

                {/* Release: v2.1.0 */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-24 relative pl-8 border-l border-white/10"
                >
                    {/* Timeline Dot */}
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-8">
                        <h2 className="text-2xl font-bold text-white">Version 2.1</h2>
                        <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/20" />
                        <div className="inline-flex items-center gap-2 text-white/40 font-mono text-sm uppercase tracking-wider">
                            <Calendar className="w-4 h-4" />
                            December 26, 2025
                        </div>
                    </div>

                    {/* Feature Spotlight: Group Travel */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-white/10 p-8 md:p-12 mb-12">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full" />

                        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-sm">
                                    <Users className="w-4 h-4" />
                                    New Feature
                                </div>
                                <h3 className="text-3xl font-bold text-white">Custom Trip Grouping</h3>
                                <p className="text-white/70 leading-relaxed text-lg">
                                    Organize your travels your way. You can now select multiple trips and combine them into a single, cohesive "Trip Group"—perfect for multi-leg journeys or big family events.
                                </p>

                                <ul className="space-y-4">
                                    <li className="flex gap-3">
                                        <div className="min-w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                            <Layers className="w-3 h-3 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Manual Curation</h4>
                                            <p className="text-white/50 text-sm">Simply enter "Select Mode" on the dashboard, pick the trips you want to group, and give them a collection name.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="min-w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                            <Share2 className="w-3 h-3 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Streamlined View</h4>
                                            <p className="text-white/50 text-sm">Grouped trips appear as a single stack on your dashboard, keeping your view clean and organized.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* Visual Representation (Abstract UI) */}
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6 relative shadow-2xl">
                                <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl" />
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="font-bold text-white text-lg">East Coast Roadtrip</div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5">
                                        <div className="text-sm text-white/80">Flight to NYC</div>
                                        <div className="text-xs text-white/40">Aug 12</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5">
                                        <div className="text-sm text-white/80">Train to DC</div>
                                        <div className="text-xs text-white/40">Aug 15</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5 opacity-50">
                                        <div className="text-sm text-white/80">Flight home</div>
                                        <div className="text-xs text-white/40">Aug 20</div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="text-xs text-indigo-400 uppercase tracking-widest font-bold">Grouped Successfully</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Cancelled Trips */}
                        <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-6 rounded-2xl transition-all">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Credit Management</h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-4">
                                Never lose track of flight credits again. When a trip is cancelled, you can now log the credit amount, split it among passengers, and track expiration dates.
                            </p>
                        </div>

                        {/* Insights */}
                        <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-6 rounded-2xl transition-all">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Travel Insights</h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-4">
                                A beautiful new dashboard tab showcasing your travel stats. Track miles flown, hours in the air, and explore your travel history by year or family member.
                            </p>
                        </div>

                        {/* Mobile & General */}
                        <div className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-6 rounded-2xl transition-all">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 mb-6 group-hover:scale-110 transition-transform">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Mobile Polish</h3>
                            <p className="text-white/60 text-sm leading-relaxed mb-4">
                                Significant improvements to the mobile experience, including better scrolling in modals, optimized touch targets, and responsive layout fixes.
                            </p>
                        </div>
                    </div>
                </motion.section>

                <footer className="border-t border-white/10 pt-12 text-center pb-20">
                    <p className="text-white/30 text-sm mb-4">
                        FamilyTravelApp v2.1.0 &middot; Built with ❤️ for the Rubin Family
                    </p>
                    <Link href="/" className="text-amber-500 hover:text-amber-400 text-sm font-bold transition-colors">
                        Go to Dashboard <ArrowRight className="w-4 h-4 inline ml-1" />
                    </Link>
                </footer>
            </div>
        </div>
    );
}
