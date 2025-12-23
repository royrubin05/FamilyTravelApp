"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TripListItem } from "@/components/dashboard/TripListItem";
import { TripGroupCard } from "@/components/dashboard/TripGroupCard";
import { ChevronLeft, ChevronRight, Layers, CheckSquare } from "lucide-react";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { useTrips } from "@/context/TripContext";
import { isTripCompleted, parseTripDate } from "@/lib/dateUtils";
import { saveTripGroup } from "@/app/trip-actions";
import { getTripRouteTitle, getTripIcon } from "@/lib/tripUtils";
import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

interface DashboardClientProps {
  initialImages: Record<string, string>;
  initialTrips: any[];
  initialGroups: any[];
  initialSettings: { backgroundImage: string | null };
}

export default function DashboardClient({ initialImages, initialTrips, initialGroups, initialSettings }: DashboardClientProps) {
  console.log("[DashboardClient] Rendering...");
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<"upcoming" | "completed" | "map">("upcoming");

  const { trips, groups, addTrip, setTrips, setGroups } = useTrips();
  // Settings handled by GlobalHeader, but we use initialSettings for filtering/background
  const settings = initialSettings;

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Sync Server Data to Client Context on Mount
  useEffect(() => {
    if (initialTrips && initialTrips.length > 0) {
      console.log("Hydrating from server trips:", initialTrips.length);
      localStorage.removeItem("family_travel_trips");
      setTrips(initialTrips);
    }
    if (initialGroups) {
      setGroups(initialGroups);
    }
  }, [initialTrips, initialGroups, setTrips, setGroups]);

  const toggleTripSelection = (id: string) => {
    const newSet = new Set(selectedTripIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTripIds(newSet);
  };

  const handleCreateGroup = async () => {
    if (selectedTripIds.size < 2) return;

    const groupName = prompt("Enter a name for this trip group (e.g., 'East Coast Roadtrip'):");
    if (!groupName) return;

    setIsCreatingGroup(true);
    const selectedIds = Array.from(selectedTripIds);

    // Find earliest and latest dates
    const selectedTrips = trips.filter(t => selectedIds.includes(t.id));
    const sortedSelected = selectedTrips.sort((a, b) => parseTripDate(a.dates) - parseTripDate(b.dates));

    const startDate = sortedSelected[0]?.dates || "Unknown"; // Improve date extraction logic if needed
    const endDate = sortedSelected[sortedSelected.length - 1]?.dates || "Unknown";

    const newGroup = {
      title: groupName,
      ids: selectedIds,
      startDate: startDate,
      endDate: endDate,
      image: selectedTrips[0]?.image || ""
    };

    const res = await saveTripGroup(newGroup);
    if (res.success) {
      router.refresh();
      setIsSelectionMode(false);
      setSelectedTripIds(new Set());
    } else {
      alert("Failed to create group");
    }
    setIsCreatingGroup(false);
  };

  const familyMembers = (initialSettings as any).familyMembers || [];
  const memberFilters = [
    { id: "all", label: "All Travelers" },
    ...familyMembers.map((m: any) => ({ id: m.id, label: m.name }))
  ];

  // Logic: 
  // 1. Identify trips that are already in a group *that we know of*.
  const groupedTripIds = new Set(groups.flatMap(g => g.ids || []));

  // 2. Filter Status (Upcoming/Completed)
  // Logic: If a group has ANY upcoming trip, the group is upcoming.
  // We need to apply status filter to items.

  // Mixed List Construction
  const ungroupedTrips = trips.filter(t => !groupedTripIds.has(t.id));

  type DashboardItem = { type: 'group' } & any | { type: 'trip' } & any;

  const allItems: DashboardItem[] = [
    ...groups.map(g => {
      // items validation
      const ids = g.ids || [];
      const groupTrips = trips.filter(t => ids.includes(t.id));

      // Calculate dynamic dates
      let computedStartDate = g.startDate;
      let computedEndDate = g.endDate;

      if (groupTrips.length > 0) {
        const sortedGroupTrips = groupTrips.sort((a, b) => parseTripDate(a.dates) - parseTripDate(b.dates));
        const first = sortedGroupTrips[0];
        const last = sortedGroupTrips[sortedGroupTrips.length - 1];

        computedStartDate = first.dates.split(" - ")[0];
        const lastParts = last.dates.split(" - ");
        computedEndDate = lastParts[lastParts.length - 1];
      }

      const dateForSort = groupTrips[0]?.dates || g.startDate || "";
      const isCompleted = isTripCompleted(dateForSort);

      return {
        type: 'group',
        ...g,
        ids,
        isCompleted,
        dateForSort,
        displayStartDate: computedStartDate,
        displayEndDate: computedEndDate
      };
    }),
    ...ungroupedTrips.map(t => {
      const dates = t.dates || "";
      const isCompleted = isTripCompleted(dates);
      // User Request: Use human_title as the main title
      const tAny = t as any;
      const displayTitle = tAny.ai_summary?.human_title || tAny.trip_title_dashboard || t.destination;

      return {
        type: 'trip',
        ...t,
        destination: displayTitle,
        isCompleted,
        dateForSort: dates
      };
    })
  ];

  // Apply Status Filter
  const statusFilteredItems = allItems.filter(item => {
    return statusTab === "completed" ? item.isCompleted : !item.isCompleted;
  });

  // Apply Member Filter
  const finalFilteredItems = filter === "all"
    ? statusFilteredItems
    : statusFilteredItems.filter(item => {
      if (item.type === 'group') {
        const ids = (item as any).ids || [];
        const groupTrips = trips.filter(t => ids.includes(t.id));
        if (filter === 'all') return true;

        const selectedMember = familyMembers.find((m: any) => m.id === filter);
        if (!selectedMember) return false;

        const matchTerms = [
          selectedMember.name,
          ...(selectedMember.nicknames || []),
          selectedMember.nickname
        ].filter(Boolean).map(term => term.toLowerCase());

        return groupTrips.some(t => {
          return t.travelers?.some((traveler: any) => {
            const tName = (typeof traveler === "string" ? traveler : traveler.name || "").toLowerCase();
            return matchTerms.some(term => tName.includes(term) || term.includes(tName));
          });
        });
      }

      if (item.type === 'trip') {
        const t = item as any; // Cast to access travelers safely
        const selectedMember = familyMembers.find((m: any) => m.id === filter);
        if (!selectedMember) return false;

        const matchTerms = [
          selectedMember.name,
          ...(selectedMember.nicknames || []),
          selectedMember.nickname
        ].filter(Boolean).map(term => term.toLowerCase());

        return t.travelers?.some((traveler: any) => {
          const tName = (typeof traveler === "string" ? traveler : traveler.name || "").toLowerCase();
          return matchTerms.some(term => tName.includes(term) || term.includes(tName));
        });
      }

      return false;
    });

  // Sort
  const sortedItems = finalFilteredItems.sort((a, b) => parseTripDate(a.dateForSort) - parseTripDate(b.dateForSort));

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div
      className="min-h-screen bg-neutral-950 text-white p-4 md:p-8 font-sans transition-all duration-700 bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: settings?.backgroundImage ? `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${settings.backgroundImage})` : undefined
      }}
    >

      {/* Header */}
      <GlobalHeader>
        {isSelectionMode ? (
          <button
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedTripIds(new Set());
            }}
            className="px-3 py-2 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel Selection
          </button>
        ) : (
          <button
            onClick={() => setIsSelectionMode(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            title="Select Trips to Group"
          >
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Select Mode</span>
          </button>
        )}
      </GlobalHeader>

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

      {/* Floating Action Bar for Group Creation */}
      <AnimatePresence>
        {isSelectionMode && selectedTripIds.size >= 2 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
          >
            <button
              onClick={handleCreateGroup}
              disabled={isCreatingGroup}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
            >
              {isCreatingGroup ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Layers className="h-5 w-5" />
                  <span>Create Group ({selectedTripIds.size})</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map View */}
      {statusTab === "map" ? (
        <div className="max-w-4xl mx-auto mb-20 animate-in fade-in duration-500">
          <TripMap
            trips={finalFilteredItems}
            onTripClick={(id) => router.push(`/trip/${id}`)}
          />
        </div>
      ) : (
        /* List View */
        <div className="max-w-4xl mx-auto space-y-3 min-h-[300px] mb-20">
          <AnimatePresence mode="popLayout">
            {paginatedItems.map((item: any) => {
              if (item.type === 'group') {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TripGroupCard
                      group={item}
                      tripCount={item.ids.length}
                      onClick={() => router.push(`/group/${item.id}`)}
                    />
                  </motion.div>
                );
              }

              // Standard Trip
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <TripListItem
                    id={item.id}
                    // Use AI Title -> Algo Title -> Destination
                    destination={item.trip_title_dashboard || getTripRouteTitle(item)}
                    dates={item.dates}
                    image={getTripIcon(item)}
                    travelers={item.travelers || []}
                    hasFlights={item.flights && item.flights.length > 0}
                    hasHotels={item.hotels && item.hotels.length > 0}
                    familyMembers={familyMembers}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedTripIds.has(item.id)}
                    onToggleSelection={toggleTripSelection}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {finalFilteredItems.length === 0 && (
            <div className="text-center py-20 opacity-40">
              <p>No trips found in {statusTab}.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="max-w-4xl mx-auto mt-8 flex justify-between items-center border-t border-white/10 pt-4 pb-12">
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

    </div>
  );
}
