"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { deleteTripAction, deleteTripGroupAction } from "@/app/trip-actions";
import type { Trip, TripGroup } from "@/types/trip";

interface TripContextType {
    trips: Trip[];
    groups: TripGroup[];
    addTrip: (trip: Trip) => void;
    deleteTrip: (id: string) => void;
    setTrips: (trips: Trip[]) => void;
    setGroups: (groups: TripGroup[]) => void;
    deleteGroup: (id: string) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
    // console.log("[TripProvider] Mounting...");
    const [trips, setTrips] = useState<Trip[]>([]);
    const [groups, setGroups] = useState<TripGroup[]>([]);

    const addTrip = (trip: Trip) => {
        setTrips((prev) => [trip, ...prev]);
    };

    const deleteTrip = async (id: string) => {
        // Optimistic Update
        setTrips((prev) => prev.filter((t) => t.id !== id));
        // Server Update
        await deleteTripAction(id);
    };

    const deleteGroup = async (id: string) => {
        setGroups((prev) => prev.filter((g) => g.id !== id));
        await deleteTripGroupAction(id);
    };

    return (
        <TripContext.Provider value={{ trips, groups, setTrips, setGroups, addTrip, deleteTrip, deleteGroup }}>
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
