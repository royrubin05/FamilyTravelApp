"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import packageJson from "../../../package.json";

export function Footer() {
    const pathname = usePathname();
    const isLanding = pathname === "/" || pathname === "/login" || pathname === "/login-v2";

    if (isLanding) return null;

    return (
        <footer className="w-full py-6 text-center text-white/20 text-xs font-mono tracking-widest uppercase">
            <p>
                TravelRoots &copy; {new Date().getFullYear()} •
                <Link href="/release-notes" className="hover:text-white/40 transition-colors mx-1">
                    v{packageJson.version}
                </Link> •
                <Link href="/release-notes" className="hover:text-white/40 transition-colors ml-1">
                    Release Notes
                </Link>
            </p>
        </footer>
    );
}
