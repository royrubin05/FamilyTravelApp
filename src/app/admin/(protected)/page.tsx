import Link from "next/link";
import { Users, Map, Sparkles, FileText } from "lucide-react";
import { AdminStats } from "@/components/admin/AdminStats";
import { CronHeartbeat } from "@/components/dashboard/CronHeartbeat";

export default function AdminPage() {
    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-neutral-400">System overview and management tools.</p>
            </div>

            <AdminStats />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CronHeartbeat />
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">Quick Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/admin/families" className="group block p-6 bg-neutral-900 border border-white/10 rounded-xl hover:bg-neutral-800 transition-colors">
                        <div className="h-12 w-12 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Manage Families</h3>
                        <p className="text-sm text-neutral-400">Create and manage family accounts and access controls.</p>
                    </Link>

                    <Link href="/admin/trips" className="group block p-6 bg-neutral-900 border border-white/10 rounded-xl hover:bg-neutral-800 transition-colors">
                        <div className="h-12 w-12 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Map className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Global Trips</h3>
                        <p className="text-sm text-neutral-400">View all AI-parsed trips and monitor data health.</p>
                    </Link>

                    <Link href="/admin/generator" className="group block p-6 bg-neutral-900 border border-white/10 rounded-xl hover:bg-neutral-800 transition-colors">
                        <div className="h-12 w-12 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Trip Generator</h3>
                        <p className="text-sm text-neutral-400">Generate fake test data using AI simulations.</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
