import { getCityImages } from "./image-actions";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { getTrips } from "./trip-actions";
import { getSettings } from "./settings-actions";

export const dynamic = 'force-dynamic';

export default async function Home() {
    const initialImages = await getCityImages();
    const initialTrips = await getTrips();
    const initialSettings = await getSettings();

    return <DashboardClient initialImages={initialImages} initialTrips={initialTrips} initialSettings={initialSettings} />;
}
