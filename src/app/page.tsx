import { getCityImages } from "./image-actions";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { getTrips, getTripGroups } from "./trip-actions";
import { getSettings } from "./settings-actions";

export const dynamic = 'force-dynamic';

export default async function Home() {
    const initialImages = await getCityImages();
    const initialTrips = await getTrips();
    const initialGroups = await getTripGroups();
    const initialSettings = await getSettings();

    return <DashboardClient
        initialImages={initialImages}
        initialTrips={initialTrips}
        initialGroups={initialGroups}
        initialSettings={initialSettings}
    />;
}
