"use client";

import { usePathname } from "next/navigation";
import packageJson from "../../../package.json";

export function Footer() {
    const pathname = usePathname();
    const isLanding = pathname === "/" || pathname === "/login" || pathname === "/login-v2";

    if (isLanding) return null;

    return (
        <footer className="w-full py-6 text-center text-white/20 text-xs font-mono tracking-widest uppercase">
            <p>TravelRoots &copy; {new Date().getFullYear()} • v{packageJson.version}</p>
        </footer>
    );
}
