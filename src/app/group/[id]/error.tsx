"use client";

import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Group Page Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                <h2 className="text-2xl font-serif font-bold mb-4 text-red-400">Something went wrong!</h2>
                <div className="bg-black/40 p-4 rounded-lg mb-6 border border-white/5 overflow-auto max-h-40">
                    <code className="text-xs font-mono text-white/70">
                        {error.message || "Unknown error occurred"}
                    </code>
                    {error.digest && (
                        <div className="mt-2 text-[10px] text-white/30 uppercase tracking-widest">
                            Digest: {error.digest}
                        </div>
                    )}
                </div>

                <div className="flex gap-4">
                    <Link
                        href="/"
                        className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-center text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" /> Home
                    </Link>
                    <button
                        onClick={() => reset()}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-center text-sm font-bold uppercase tracking-wider transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </div>
        </div>
    );
}
