"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TripListItem } from "@/components/dashboard/TripListItem";
import { UploadTripModal } from "@/components/dashboard/UploadTripModal";
import { User, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useTrips } from "@/context/TripContext";

import { useRouter } from "next/navigation";
import { SettingsModal } from "./SettingsModal";
import { Settings } from "lucide-react";

interface DashboardClientProps {
  initialImages: Record<string, string>;
  initialTrips: any[];
}

export default function DashboardClient({ initialImages, initialTrips }: DashboardClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"upcoming" | "completed">("upcoming");
  const { trips, addTrip, setTrips } = useTrips(); // We need to expose setTrips from context first!

  // Sync Server Data to Client Context on Mount
  useEffect(() => {
    if (initialTrips && initialTrips.length > 0) {
      console.log("Hydrating from server trips:", initialTrips.length);
      // Force clear local storage to prefer server data on this load
      // This fixes the issue where old "Roy" data persists in LocalStorage
      localStorage.removeItem("family_travel_trips");
      // Rudimentary sync: if context is empty or we want to trust server authoritative
      // For now, let's merge or set. 
      // Since we want file-based persistence, server is truth.
      setTrips(initialTrips);
    }
  }, [initialTrips, setTrips]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Merge initial server images with any local overrides if we added that, 
  // but for now let's reuse initialImages. 
  // To verify live updates without refresh, we might need state, but revalidatePath on server might be enough if we refresh?
  // Actually the Server Action revalidates, so the page should reload data? No, valid for server components.
  // We might need to refresh the router.

  // For now let's just hold it in state and allow the Manager to update it?
  // The Manager takes `initialImages` but doesn't pass updated back up easily without callback.
  // Actually Manager is Client, updates persist on Server.
  // Revalidating path '/' redoes the server fetch.

  const [currentImages, setCurrentImages] = useState(initialImages);

  const handleImageUpdate = (city: string, url: string) => {
    setCurrentImages(prev => ({ ...prev, [city]: url }));
    router.refresh(); // Ensure server components (TripPage) get fresh data
  };

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
    { id: "all", label: "All Travelers" },
    ...Array.from(allMembersMap.entries()).map(([id, name]) => ({ id, label: name as string }))
  ];

  // 1. Filter by Status Tab
  const statusFilteredTrips = trips.filter(t => {
    // Mock Logic: London is completed, everything else (including imports) is upcoming
    const isCompleted = t.id === "london" || (t.destination && t.destination.includes("OLD"));
    return statusTab === "completed" ? isCompleted : !isCompleted;
  });

  // 2. Filter by Member
  const finalFilteredTrips = filter === "all"
    ? statusFilteredTrips
    : statusFilteredTrips.filter(t => t.travelers.some((m: any) => m.id === filter));

  // 3. Pagination
  const totalPages = Math.ceil(finalFilteredTrips.length / ITEMS_PER_PAGE);
  const paginatedTrips = finalFilteredTrips.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleUploadComplete = (newTrip: any) => {
    // addTrip(newTrip); // REMOVED: Rely on server sync (revalidatePath -> initialTrips -> useEffect)
    // Adding locally causes duplicate keys because useEffect *also* adds it from server props.
    router.refresh();
    setStatusTab("upcoming");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans">

      {/* Header */}
      <header className="flex justify-between items-center mb-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-serif tracking-wider text-white">Rubin Family Travel</h1>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Family Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Import Trip</span>
          </button>
        </div>
      </header>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentImages={currentImages}
        onUpdateImage={handleImageUpdate}
      />

      {/* Status Tabs */}
      <div className="max-w-4xl mx-auto mb-6 border-b border-white/10">
        <div className="flex gap-8">
          <button
            onClick={() => { setStatusTab("upcoming"); setCurrentPage(1); }}
            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${statusTab === "upcoming" ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
          >
            Upcoming
            {statusTab === "upcoming" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => { setStatusTab("completed"); setCurrentPage(1); }}
            className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${statusTab === "completed" ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
          >
            Completed
            {statusTab === "completed" && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
        </div>
      </div>

      {/* Member Filters */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          {memberFilters.map((m) => (
            <button
              key={m.id}
              onClick={() => { setFilter(m.id); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border whitespace-nowrap ${filter === m.id
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
      <div className="max-w-4xl mx-auto space-y-3 min-h-[300px]">
        <AnimatePresence mode="popLayout">
          {paginatedTrips.map((trip) => (
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
                travelers={trip.travelers || []}
                destinationImages={currentImages}
                hasFlights={trip.flights && trip.flights.length > 0}
                hasHotels={trip.hotels && trip.hotels.length > 0}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {finalFilteredTrips.length === 0 && (
          <div className="text-center py-20 opacity-40">
            <p>No trips found in {statusTab}.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="max-w-4xl mx-auto mt-8 flex justify-between items-center border-t border-white/10 pt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          <span className="text-xs text-white/40 font-mono">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
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
