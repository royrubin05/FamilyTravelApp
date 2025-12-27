"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TripListItem } from "@/components/dashboard/TripListItem";
import { TripGroupCard } from "@/components/dashboard/TripGroupCard";
// ... imports
import { ChevronLeft, ChevronRight, Layers, CheckSquare, Settings, Plus, X, Filter, RefreshCw, Trash2, ArchiveRestore, Sparkles, CreditCard, ChevronDown } from "lucide-react";


import { GlobalHeader, GlobalHeaderRef } from "@/components/ui/GlobalHeader";
import { useTrips } from "@/context/TripContext";
import { isTripCompleted, parseTripDate } from "@/lib/dateUtils";
import { saveTripGroup, restoreTripAction, deleteTripAction } from "@/app/trip-actions";
import { getTripRouteTitle, getTripIcon } from "@/lib/tripUtils";
import dynamic from "next/dynamic";
import { InsightsTab } from "@/components/dashboard/insights/InsightsTab";
import { ENABLE_INSIGHTS } from "@/lib/flags";

const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<"upcoming" | "completed" | "map" | "insights" | "cancelled">("upcoming");

  const { trips, groups, addTrip, setTrips, setGroups, deleteTrip } = useTrips();
  // Settings handled by GlobalHeader, but we use initialSettings for filtering/background
  const settings = initialSettings;

  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<any | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const headerRef = useRef<GlobalHeaderRef>(null);

  // Empty State Logic
  // We use the 'trips' from context which are hydrated from initialTrips
  const isEmptyState = trips.length === 0 && (!initialTrips || initialTrips.length === 0);

  // Sync Server Data to Client Context on Mount
  useEffect(() => {
    if (initialTrips && initialTrips.length > 0) {
      console.log("Hydrating from server trips:", initialTrips.length);

      // Deduplicate trips by ID just in case
      const uniqueTrips = Array.from(new Map(initialTrips.map(item => [item.id, item])).values());
      if (uniqueTrips.length !== initialTrips.length) {
        console.warn("Found duplicate trips in initialTrips! Deduplicating...", initialTrips.length - uniqueTrips.length);
      }

      localStorage.removeItem("family_travel_trips");
      setTrips(uniqueTrips);
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
  // Separate active and cancelled trips
  const activeTrips = trips.filter((t: any) => t.status !== 'cancelled');

  // 2. Identify trips that are already in a group *that we know of*.
  const groupedTripIds = new Set(groups.flatMap(g => g.ids || []));

  // 3. Mixed List Construction (using activeTrips only)
  const ungroupedTrips = activeTrips.filter(t => !groupedTripIds.has(t.id));

  type DashboardItem = { type: 'group' } & any | { type: 'trip' } & any;

  const allItems: DashboardItem[] = [
    ...groups.map(g => {
      // items validation
      const ids = g.ids || [];
      const groupTrips = activeTrips.filter(t => ids.includes(t.id));

      if (groupTrips.length === 0) return null; // Filter out empty groups later

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
    }).filter(Boolean), // Filter out nulls
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
  ] as DashboardItem[];

  // Apply Status Filter
  const statusFilteredItems = allItems.filter(item => {
    return statusTab === "completed" ? item.isCompleted : !item.isCompleted;
  });
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

  // Filter Cancelled Trips
  const filteredCancelledTrips = trips.filter(t => {
    if ((t as any).status !== 'cancelled') return false;

    if (filter === 'all') return true;
    const selectedMember = familyMembers.find((m: any) => m.id === filter);
    if (!selectedMember) return false;

    const matchTerms = [
      selectedMember.name,
      ...(selectedMember.nicknames || []),
      selectedMember.nickname
    ].filter(Boolean).map((term: string) => term.toLowerCase());

    return t.travelers?.some((traveler: any) => {
      const tName = (typeof traveler === "string" ? traveler : traveler.name || "").toLowerCase();
      return matchTerms.some(term => tName.includes(term) || term.includes(tName));
    });
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
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${settings?.backgroundImage || "/images/backgrounds/bg-1766165588828.webp"})`
      }}
    >

      {/* Header */}
      <GlobalHeader
        ref={headerRef}
        additionalMenuItems={[
          {
            label: "Create Trip Group",
            icon: <Layers className="h-4 w-4 text-neutral-500" />,
            onClick: () => {
              setIsSelectionMode(true);
              setSelectedTripIds(new Set());
            }
          }
        ]}
      >
        {isSelectionMode && (
          <button
            onClick={() => {
              setIsSelectionMode(false);
              setSelectedTripIds(new Set());
            }}
            className="px-4 py-2 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
          >
            Cancel Selection
          </button>
        )}
      </GlobalHeader>

      {isEmptyState ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12 animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 tracking-tight">
              Welcome
            </h1>
            <p className="text-xl text-white/60 max-w-lg mx-auto leading-relaxed">
              Your travel journey begins here.
            </p>
          </div>

          <div className="grid gap-6 w-full max-w-md mx-auto text-left">
            {/* Step 1 */}
            <div
              className="group bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-900/20 hover:border-blue-500/30"
              onClick={() => headerRef.current?.openSettings()}
            >
              <div className="flex items-start gap-5">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <Settings className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg text-white ml-0">Step 1</h3>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed group-hover:text-white/80 transition-colors">
                    Add your family members in the Settings section.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 transition-all duration-300">
              <div className="flex items-start gap-5">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white mb-1">Step 2</h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Upload trips using the <span className="font-bold text-white px-1.5 py-0.5 bg-white/10 rounded uppercase text-xs tracking-wider">Trip Actions</span> button on the top right.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-white/30 italic font-serif text-2xl">
              "Enjoy and safe travels"
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Status Tabs */}
          <div className="max-w-4xl mx-auto mb-6 border-b border-white/10 relative z-30">
            {/* Mobile Dropdown Trigger */}
            <div className="md:hidden mb-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-white/50" />
                  <span>
                    {statusTab === "upcoming" && "Upcoming Trips"}
                    {statusTab === "completed" && "Completed Trips"}
                    {statusTab === "cancelled" && "Cancelled / Credit"}
                    {statusTab === "insights" && "Travel Insights"}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform text-white/30 ${isMobileMenuOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isMobileMenuOpen && (
                  <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm md:hidden">
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 500 }}
                      className="w-full bg-neutral-900 rounded-t-2xl border-t border-white/10 p-6 pb-12 max-h-[80vh] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-serif text-white">Select View</h3>
                        <button
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => { setStatusTab("upcoming"); setCurrentPage(1); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-colors ${statusTab === "upcoming" ? "bg-white text-black font-bold" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                        >
                          <span>Upcoming Trips</span>
                          {statusTab === "upcoming" && <CheckSquare className="h-5 w-5" />}
                        </button>

                        <button
                          onClick={() => { setStatusTab("completed"); setCurrentPage(1); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-colors ${statusTab === "completed" ? "bg-white text-black font-bold" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                        >
                          <span>Completed Trips</span>
                          {statusTab === "completed" && <CheckSquare className="h-5 w-5" />}
                        </button>

                        <button
                          onClick={() => { setStatusTab("cancelled"); setCurrentPage(1); setIsMobileMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-colors ${statusTab === "cancelled" ? "bg-white text-black font-bold" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                        >
                          <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Cancelled / Credits</span>
                          {statusTab === "cancelled" && <CheckSquare className="h-5 w-5" />}
                        </button>

                        {ENABLE_INSIGHTS && (
                          <button
                            onClick={() => { setStatusTab("insights"); setCurrentPage(1); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-colors ${statusTab === "insights" ? "bg-white text-black font-bold" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                          >
                            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Insights</span>
                            {statusTab === "insights" && <CheckSquare className="h-5 w-5" />}
                          </button>
                        )}
                      </div>
                    </motion.div>
                    <div
                      className="absolute inset-0 z-[-1]"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop Tabs (Original) - Hidden on Mobile */}
            <div className="hidden md:flex justify-between items-end">
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

                {/* Cancelled / Credits Tab */}
                <button
                  onClick={() => { setStatusTab("cancelled"); setCurrentPage(1); }}
                  className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${statusTab === "cancelled" ? "text-amber-500/80" : "text-white/20 hover:text-white/50"
                    }`}
                >
                  Cancelled / Credit
                  {statusTab === "cancelled" && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/50" />
                  )}
                </button>
              </div>

              {ENABLE_INSIGHTS && (
                <button
                  onClick={() => { setStatusTab("insights"); setCurrentPage(1); }}
                  className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative flex items-center gap-2 ${statusTab === "insights" ? "text-purple-400" : "text-white/40 hover:text-white/70"
                    }`}
                >
                  <Sparkles className="h-4 w-4" />
                  Insights
                  {statusTab === "insights" && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Member Filters - Same as before */}
          <div className="max-w-4xl mx-auto mb-8">
            {/* ... Filters UI ... */}
            {/* Keeping existing Filter JSX implicitly via context match if possible, but replace block targets it? */}
            {/* Wait, the replace block below starts AFTER filter UI. I need to be careful with context. */}
            {/* Actually I'm REPLACING the tabs section, so I can just include the new tab safely. */}

            <div className="hidden md:flex gap-3 overflow-x-auto pb-4 no-scrollbar">
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
            {/* Mobile View: Modal Trigger */}
            <div className="md:hidden">
              <button
                onClick={() => setIsFilterOpen(true)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-white/50" />
                  <span>
                    {filter === "all"
                      ? "All Travelers"
                      : `Filter by: ${memberFilters.find(m => m.id === filter)?.label}`}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 rotate-90 text-white/30" />
              </button>
            </div>
          </div>

          {/* Mobile Filter Modal */}
          <AnimatePresence>
            {isFilterOpen && (
              <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm md:hidden">
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 500 }}
                  className="w-full bg-neutral-900 rounded-t-2xl border-t border-white/10 p-6 pb-12 max-h-[80vh] overflow-y-auto"
                >
                  {/* ... Filter Modal Content ... */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-serif text-white">Filter by Person</h3>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {memberFilters.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setFilter(m.id);
                          setCurrentPage(1);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-4 rounded-xl text-left transition-colors ${filter === m.id
                          ? "bg-white text-black font-bold"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                          }`}
                      >
                        <span>{m.label}</span>
                        {filter === m.id && <CheckSquare className="h-5 w-5" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
                <div
                  className="absolute inset-0 z-[-1]"
                  onClick={() => setIsFilterOpen(false)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Floating Action Bar for Group Creation */}
          {/* ... */}
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
          ) : statusTab === "insights" ? (
            <div className="mb-20">
              <InsightsTab
                trips={activeTrips}
                currentTravelerName={
                  filter === "all"
                    ? "all"
                    : familyMembers.find((m: any) => m.id === filter)?.name || "all"
                }
              />
            </div>
          ) : statusTab === "cancelled" ? (
            /* Cancelled Trips View */
            <div className="max-w-4xl mx-auto space-y-4 mb-20 animate-in fade-in">
              {filteredCancelledTrips.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5">
                  <CreditCard className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white/40">No Cancelled Trips / Credits</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCancelledTrips.map((trip) => (
                    <div key={trip.id} className="group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:bg-white/5 transition-all">
                      {/* Image & Header */}
                      <div className="aspect-video relative">
                        <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity grayscale"
                          style={{ backgroundImage: `url(${statusTab === 'cancelled' ? '/images/flight_credit_card_bg.png' : getTripIcon(trip)})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                        <div className="absolute bottom-3 left-3 right-3 text-left">
                          <h4 className="font-serif text-lg leading-tight mb-1 text-white/80 line-through decoration-white/30 decoration-2">
                            {trip.destination}
                          </h4>
                          <p className="text-xs text-white/40 font-mono uppercase tracking-wider">
                            {trip.dates}
                          </p>
                        </div>

                        {/* Action Buttons Top Right */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setTripToDelete(trip)}
                            className="p-2 bg-black/50 hover:bg-red-600/80 text-white/70 hover:text-white rounded-lg backdrop-blur-md transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Credit Info Section */}
                      <div className="p-4 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm uppercase tracking-wider text-amber-500/80 font-bold flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Credit Record
                          </div>
                          {(trip as any).credits && Object.values((trip as any).credits).some((v: any) => v > 0) && (
                            <div className="text-lg bg-amber-500/10 text-amber-400 px-3 py-1 rounded border border-amber-500/20 font-bold">
                              ${(Object.values((trip as any).credits) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString()} Credit
                            </div>
                          )}
                        </div>

                        {/* Expiration warning */}
                        {(trip as any).creditExpirationDate && (
                          <div className="text-sm text-white/60 flex justify-between font-medium">
                            <span>Expires:</span>
                            <span className="font-mono text-white/90 font-bold">
                              {new Date((trip as any).creditExpirationDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        )}

                        {/* Credit Breakdown - Only show if > 0 */}
                        {(trip as any).credits && Object.keys((trip as any).credits).length > 0 && (
                          <div className="bg-white/5 rounded-lg p-3 space-y-2">
                            {Object.entries((trip as any).credits).map(([key, amount]: [string, any]) => {
                              if (amount <= 0) return null;
                              const travelerName = familyMembers.find((m: any) => m.id === key)?.name
                                || (trip.travelers?.find((t: any) => t.id === key)?.name)
                                || key;
                              return (
                                <div key={key} className="flex justify-between text-base text-white/80 font-medium">
                                  <span>{travelerName}</span>
                                  <span className="font-mono text-amber-400 font-bold">${amount.toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        </>
      )}

      <ConfirmationModal
        isOpen={!!tripToDelete}
        title="Delete Flight Credit Record"
        message={`Are you sure you want to permanently delete this record for ${tripToDelete?.destination}? This action cannot be undone.`}
        confirmLabel="Delete Forever"
        onConfirm={async () => {
          if (tripToDelete) {
            await deleteTrip(tripToDelete.id);
            setTripToDelete(null);
          }
        }}
        onCancel={() => setTripToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
}
