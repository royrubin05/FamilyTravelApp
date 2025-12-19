"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TRIPS } from "@/lib/data";
import { TripListItem } from "@/components/dashboard/TripListItem";
import { UploadTripModal } from "@/components/dashboard/UploadTripModal";
import { User, Plus } from "lucide-react";

export default function FamilyDashboard() {
  const [filter, setFilter] = useState("all");
  const [trips, setTrips] = useState(TRIPS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Extract unique members from all trips (using current state)
  const allMembersMap = new Map();
  trips.forEach(t => {
    t.travelers.forEach((Traveler: any) => {
      if (!allMembersMap.has(Traveler.id)) {
        allMembersMap.set(Traveler.id, Traveler.name);
      }
    });
  });

  const memberFilters = [
    { id: "all", label: "All Trips" },
    ...Array.from(allMembersMap.entries()).map(([id, name]) => ({ id, label: name as string }))
  ];

  // Filter trips based on selection
  const filteredTrips = filter === "all"
    ? trips
    : trips.filter(t => t.travelers.some((m: any) => m.id === filter));

  const handleUploadComplete = (newTrip: any) => {
    setTrips(prev => [newTrip, ...prev]);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans">

      {/* Header */}
      <header className="flex justify-between items-center mb-10 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-serif tracking-wider text-white">TRAVEL_DATA</h1>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Family Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Import Trip</span>
          </button>
          <User className="h-6 w-6 opacity-60 hover:opacity-100 cursor-pointer" />
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {memberFilters.map((m) => (
            <button
              key={m.id}
              onClick={() => setFilter(m.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all duration-200 border whitespace-nowrap ${filter === m.id
                ? "bg-white text-black border-white"
                : "bg-white/5 text-white/50 border-white/10 hover:border-white/30 hover:bg-white/10"
                }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* List View */}
      <div className="max-w-4xl mx-auto space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredTrips.map((trip) => (
            <motion.div
              key={trip.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <TripListItem
                id={trip.id}
                destination={trip.destination}
                dates={trip.dates}
                image={trip.image}
                travelerCount={trip.travelers.length || 2}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTrips.length === 0 && (
        <div className="text-center py-20 opacity-40">
          <p>No trip records found.</p>
        </div>
      )}

      {/* Upload Modal */}
      <UploadTripModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

    </div>
  );
}
