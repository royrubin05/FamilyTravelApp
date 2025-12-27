"use client";

import Image from "next/image";

export function PublicHeader() {
    return (
        <header className="flex flex-row justify-between items-center mb-4 pt-4 max-w-4xl mx-auto relative z-40">
            <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
                <div className="relative h-12 w-[165px] md:h-20 md:w-[275px]">
                    <Image
                        src="/images/travelroots-logo-v3.png"
                        alt="TravelRoots"
                        fill
                        className="object-contain object-left"
                        priority
                        sizes="(max-width: 768px) 165px, 275px"
                    />
                </div>
            </div>
            {/* No other actions */}
        </header>
    );
}
