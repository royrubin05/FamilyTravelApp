import { db } from "@/lib/firebase";
import { Users, Plane } from "lucide-react";

async function getStats() {
    try {
        // Use Admin SDK for server-side counting (efficient, no reads)
        const [usersSnapshot, tripsSnapshot] = await Promise.all([
            db.collection("users").count().get(),
            db.collectionGroup("trips").count().get()
        ]);

        return {
            families: usersSnapshot.data().count,
            trips: tripsSnapshot.data().count
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return { families: 0, trips: 0 };
    }
}

export async function AdminStats() {
    const stats = await getStats();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-neutral-900 border border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-400">Total Families</p>
                        <h3 className="text-2xl font-bold text-white">{stats.families}</h3>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-neutral-900 border border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <Plane className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-400">Trips Imported</p>
                        <h3 className="text-2xl font-bold text-white">{stats.trips}</h3>
                    </div>
                </div>
            </div>
        </div>
    );
}
