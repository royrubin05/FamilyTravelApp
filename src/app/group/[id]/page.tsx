import { getCityImages } from "@/app/image-actions";
import GroupContent from "@/components/group/GroupContent";
import { TripGroup } from "@/types/trip";
import { getTrips, getTripGroups } from "@/app/trip-actions";
import { parseTripDate } from "@/lib/dateUtils";
import { getSettings } from "@/app/settings-actions";
import { cookies } from "next/headers";

interface GroupPageProps {
    params: Promise<{
        id: string;
    }>
}

export default async function GroupPage({ params }: GroupPageProps) {
    try {
        const resolvedParams = await params;
        const groups = await getTripGroups();
        const group = groups.find((g: any) => g.id === resolvedParams.id) as TripGroup | undefined;

        if (!group) {
            return <div className="p-10 text-white">Group not found</div>;
        }

        const allTrips = await getTrips();
        // Filter trips that belong to this group - specific safety check for ids
        const groupIds = group.ids || [];
        const subTrips = allTrips
            .filter((t: any) => groupIds.includes(t.id))
            .sort((a: any, b: any) => {
                // Sort by the order defined in the group's 'ids' array
                const indexA = groupIds.indexOf(a.id);
                const indexB = groupIds.indexOf(b.id);
                return indexA - indexB;
            });

        const initialImages = await getCityImages();
        const settings = await getSettings();

        // Check auth status
        const cookieStore = await cookies();
        const isAuthenticated = !!cookieStore.get("auth_session");

        return <GroupContent group={group} trips={subTrips} allTrips={allTrips} initialImages={initialImages} isAuthenticated={isAuthenticated} backgroundImage={settings?.backgroundImage} />;
    } catch (error) {
        console.error("Error rendering GroupPage:", error);
        return <div className="p-10 text-white">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <pre className="bg-white/10 p-4 rounded text-xs overflow-auto">
                {error instanceof Error ? error.message : "Unknown error"}
            </pre>
        </div>;
    }
}
