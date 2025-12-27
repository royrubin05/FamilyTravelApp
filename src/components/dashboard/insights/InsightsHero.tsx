"use client";

import { motion } from "framer-motion";

interface InsightsHeroProps {
    quirkyText: string;
}

export function InsightsHero({ quirkyText }: InsightsHeroProps) {
    // Split text by bold/highlight parts if needed, or just render styling.
    // For now, let's assume the hook returns plain text, but we want to highlight numbers.
    // We can use a simple regex to wrap numbers in a span.

    const highlightNumbers = (text: string) => {
        const parts = text.split(/([\d,]+)/);
        return parts.map((part, i) => {
            if (part.match(/^[\d,]+$/)) {
                return <span key={i} className="text-blue-400 font-bold">{part}</span>;
            }
            return part;
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="pt-0 pb-8 md:pb-12 w-full"
        >
            <h2 className="text-3xl md:text-5xl font-serif leading-tight text-white mb-6">
                {highlightNumbers(quirkyText)}
            </h2>
        </motion.div>
    );
}
