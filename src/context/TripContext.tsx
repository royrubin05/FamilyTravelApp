"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { TRIPS } from "@/lib/data";
import { deleteTripAction } from "@/app/trip-actions";

interface TripContextType {
    trips: any[];
    addTrip: (trip: any) => void;
    deleteTrip: (id: string) => void;
    setTrips: (trips: any[]) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
    // Start with empty or static, but we'll try to load from local storage
    const [trips, setTrips] = useState<any[]>(TRIPS);
    const [isLoaded, setIsLoaded] = useState(false);

    // Bootstrap: Load from LocalStorage
    useEffect(() => {
        const stored = localStorage.getItem("family_travel_trips");
        if (stored) {
            try {
                setTrips(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to load trips", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to LocalStorage whenever trips change (but only after initial load)
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("family_travel_trips", JSON.stringify(trips));
        }
    }, [trips, isLoaded]);

    const addTrip = (trip: any) => {
        setTrips((prev) => [trip, ...prev]);
    };

    const deleteTrip = async (id: string) => {
        // Optimistic Update
        setTrips((prev) => prev.filter((t) => t.id !== id));
        // Server Update
        await deleteTripAction(id);
    };

    // Avoid hydration mismatch by rendering static content or nothing until loaded?
    // Actually, simply rendering is fine, but data might jump.
    // For simplicity in this demo, we assume client-side rendering is dominant.

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
