"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { LoginModal } from "@/components/auth/LoginModal";
import { Map, Users, Sparkles, Calendar, ArrowRight, Plane, Globe } from "lucide-react";

interface LandingPageProps {
    defaultOpenLogin?: boolean;
}

export default function LandingPage({ defaultOpenLogin = false }: LandingPageProps) {
    const [isLoginOpen, setIsLoginOpen] = useState(defaultOpenLogin);

    // Auto-open logic if prop changes or on mount
    useEffect(() => {
        if (defaultOpenLogin) {
            setIsLoginOpen(true);
        }
    }, [defaultOpenLogin]);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-amber-500/30">
            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-black/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="relative w-48 h-12 md:w-56 md:h-14">
                        <Image
                            src="/images/travelroots-logo-v3.png"
                            alt="TravelRoots"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                    <button
                        onClick={() => setIsLoginOpen(true)}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm font-bold uppercase tracking-wider transition-all hover:scale-105"
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-10 md:pt-48 md:pb-12 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30 pointer-events-none">
                    <div className="absolute top-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[128px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
                            <Sparkles className="w-3 h-3" />
                            The Future of Family Travel
                        </div>

                        <h1 className="text-5xl md:text-8xl font-serif font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 max-w-4xl mx-auto leading-[1.1]">
                            Travel Smarter, <br /> Together.
                        </h1>

                        <p className="text-lg md:text-2xl text-white/50 max-w-2xl mx-auto leading-relaxed">
                            The all-in-one platform for managing complex family itineraries, tracking flight credits, and automating travel logistics.
                        </p>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8 pb-16">
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="group px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-neutral-200 transition-all flex items-center gap-2"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <div className="text-white/40 text-sm">
                                * Invite only access
                            </div>
                        </div>



                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-16 bg-neutral-950 border-t border-white/10 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Globe className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">AI Trip Extraction</h3>
                            <p className="text-white/50 leading-relaxed">
                                Simply forward your PDFs and emails. Our Gemini-powered engine instantly structues your flights, hotels, and activities into a beautiful timeline.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Group Coordination</h3>
                            <p className="text-white/50 leading-relaxed">
                                Merge multiple itineraries into unified "Trip Groups". Perfect for family reunions where everyone is flying in from different cities.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Map className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Visual Insights</h3>
                            <p className="text-white/50 leading-relaxed">
                                Dynamic maps and stats visualize your travel history. Track days spent abroad, active trip statuses, and unused flight credits.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10 text-center text-white/30 text-sm flex flex-col items-center gap-4">
                <p>&copy; {new Date().getFullYear()} TravelRoots. All rights reserved.</p>
                <a href="/release-notes" className="hover:text-white transition-colors border-b border-transparent hover:border-white/30 pb-0.5">
                    Release Notes
                </a>
            </footer>
        </div>
    );
}
