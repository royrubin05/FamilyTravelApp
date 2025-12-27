"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, Bug } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
    {
        label: "Dashboard",
        href: "/admin",
        icon: <LayoutDashboard className="h-4 w-4" />,
        exact: true
    },
    {
        label: "Families",
        href: "/admin/families",
        icon: <Users className="h-4 w-4" />
    },
    {
        label: "Upload Logs",
        href: "/admin/uploads",
        icon: <FileText className="h-4 w-4" />
    }
];

export function AdminNav() {
    const pathname = usePathname();

    return (
        <nav className="mb-8 overflow-x-auto">
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit min-w-max">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="admin-nav-active"
                                    className="absolute inset-0 bg-white/10 rounded-lg border border-white/10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                {item.icon}
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
