import { getCityImages } from "./image-actions";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { getTrips } from "./trip-actions";

export default async function Home() {
    const initialImages = await getCityImages();
    const initialTrips = await getTrips();

    return <DashboardClient initialImages={initialImages} initialTrips={initialTrips} />;
}
