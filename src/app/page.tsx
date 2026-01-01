import { getCityImages } from "./image-actions";
import DashboardClient from "@/components/dashboard/DashboardClient";
import LandingPage from "@/components/landing/LandingPage";
import { getTrips, getTripGroups } from "./trip-actions";
import { getSettings } from "./settings-actions";
import { cookies } from "next/headers";
import { TripProvider } from "@/context/TripContext";

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    const isAuthenticated = !!session;

    const showLoginModal = searchParams?.login === 'true';

    if (!isAuthenticated) {
        return <LandingPage defaultOpenLogin={showLoginModal} />;
    }

    const initialImages = await getCityImages();
    const initialTrips = await getTrips();
    const initialGroups = await getTripGroups();
    const initialSettings = await getSettings();

    return (
        <TripProvider>
            <DashboardClient
                initialImages={initialImages}
                initialTrips={initialTrips}
                initialGroups={initialGroups}
                initialSettings={initialSettings}
            />
        </TripProvider>
    );
}
