"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Map, Sparkles, LayoutDashboard, FileText, ShieldAlert } from "lucide-react";

const NAV_ITEMS = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Families", href: "/admin/families", icon: Users },
    { label: "Global Trips", href: "/admin/trips", icon: Map },
    { label: "Quarantine", href: "/admin/quarantine", icon: ShieldAlert },
    { label: "Upload Logs", href: "/admin/uploads", icon: FileText },
    { label: "Generator", href: "/admin/generator", icon: Sparkles },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full md:w-64 shrink-0 mb-8 md:mb-0 md:mr-8">
            <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-white/10 text-white"
                                : "text-neutral-400 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? "text-blue-400" : "text-neutral-500"}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
