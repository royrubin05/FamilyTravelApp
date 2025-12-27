"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { PublicHeader } from "@/components/ui/PublicHeader";

export function AccessRestricted() {
    return (
        <div className="min-h-screen bg-black text-white font-sans p-4 md:p-8">
            <PublicHeader />

            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
                <div className="bg-white/5 p-6 rounded-full mb-6 border border-white/10">
                    <Lock className="h-12 w-12 text-white/50" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
                    Access to this page is restricted.
                </h1>

                <p className="text-white/60 mb-8 leading-relaxed">
                    Public sharing for this Trip/Group has been disabled by the owner.
                    If you believe this is an error, please reach out to the person who shared this link with you.
                </p>

                <Link
                    href="/"
                    className="bg-white text-black font-bold uppercase tracking-wider text-xs px-8 py-4 rounded-full hover:bg-neutral-200 transition-colors"
                >
                    Go to TravelRoots Home Page
                </Link>
            </div>
        </div>
    );
}
