"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { deleteTripAction } from "@/app/trip-actions";

interface TripContextType {
    trips: any[];
    addTrip: (trip: any) => void;
    deleteTrip: (id: string) => void;
    setTrips: (trips: any[]) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
    const [trips, setTrips] = useState<any[]>([]);

    // Load fresh data on mount (replace LocalStorage)
    useEffect(() => {
        const loadTrips = async () => {
            try {
                const { getTrips } = await import("@/app/trip-actions");
                const serverTrips = await getTrips();
                setTrips(serverTrips);
            } catch (error) {
                console.error("Failed to load trips", error);
            }
        };
        loadTrips();
    }, []);

    const addTrip = (trip: any) => {
        setTrips((prev) => [trip, ...prev]);
    };

    const deleteTrip = async (id: string) => {
        // Optimistic Update
        setTrips((prev) => prev.filter((t) => t.id !== id));
        // Server Update
        await deleteTripAction(id);
    };

    return (
        <TripContext.Provider value={{ trips, setTrips, addTrip, deleteTrip }}>
            {children}
        </TripContext.Provider>
    );
}

export function useTrips() {
    const context = useContext(TripContext);
    if (context === undefined) {
        throw new Error("useTrips must be used within a TripProvider");
    }
    return context;
}
