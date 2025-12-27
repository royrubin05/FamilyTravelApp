"use client";

import { useState, useEffect, Fragment } from "react";
import { GlobalTrip, adminDeleteTrip, getAllFamiliesTrips } from "@/app/admin/actions";
import { Trash2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Check, ExternalLink } from "lucide-react";

export function GlobalTripManager() {
    const [trips, setTrips] = useState<GlobalTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

    const loadTrips = async () => {
        setLoading(true);
        try {
            const res = await getAllFamiliesTrips();
            if (res.success && res.data) {
                setTrips(res.data);
            }
        } catch (error) {
            console.error("Failed to load trips", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrips();
    }, []);

    const handleDelete = async (familyUid: string, tripId: string) => {
        if (!confirm("Are you sure you want to delete this trip found in a user's account? This cannot be undone.")) return;

        await adminDeleteTrip(familyUid, tripId);
        // Optimistic UI update or reload
        setTrips(trips.filter(t => t.id !== tripId));
    };

    const toggleExpand = (id: string) => {
        setExpandedTripId(expandedTripId === id ? null : id);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Global Trip Viewer</h2>
                <button
                    onClick={loadTrips}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/10 border border-white/10 text-neutral-200 rounded-lg hover:bg-white/20 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-neutral-400 uppercase bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-3 font-medium">Family</th>
                                <th className="px-6 py-3 font-medium">Destination</th>
                                <th className="px-6 py-3 font-medium">Dates</th>
                                <th className="px-6 py-3 font-medium">Uploaded</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && trips.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                                        Loading global trips...
                                    </td>
                                </tr>
                            ) : trips.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                                        No trips found across any families.
                                    </td>
                                </tr>
                            ) : (
                                trips.map((trip) => (
                                    <Fragment key={`${trip.familyUid}-${trip.id}`}>
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{trip.familyName}</div>
                                                <div className="text-xs text-neutral-400">{trip.familyUsername}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="font-medium text-white">{trip.destination}</div>
                                                        <div className="text-xs text-neutral-500 font-mono mt-0.5 max-w-[150px] truncate">{trip.id}</div>
                                                    </div>
                                                    {trip.sourceDocument && (
                                                        <a
                                                            href={trip.sourceDocument}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                                                            title="View Source File"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-300 font-medium text-sm">
                                                {trip.dates}
                                            </td>
                                            <td className="px-6 py-4 text-neutral-500 text-xs">
                                                {trip.uploadedAt ? new Date(trip.uploadedAt).toLocaleString() : "Unknown"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${trip.status === 'AI'
                                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                    }`}>
                                                    {trip.status === 'AI' && <AlertCircle className="h-3 w-3 mr-1" />}
                                                    {trip.status}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleExpand(trip.id)}
                                                        className={`p-1.5 rounded-md transition-colors ${expandedTripId === trip.id
                                                            ? 'text-blue-300 bg-blue-500/20'
                                                            : 'text-neutral-500 hover:text-blue-300 hover:bg-blue-500/10'
                                                            }`}
                                                        title="View Debug Info"
                                                    >
                                                        {expandedTripId === trip.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(trip.familyUid, trip.id)}
                                                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                        title="Delete Trip"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedTripId === trip.id && (
                                            <tr className="bg-white/5">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="space-y-4">
                                                        <details className="group" open>
                                                            <summary className="flex items-center cursor-pointer list-none mb-2 focus:outline-none">
                                                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">AI Debug Response</h4>
                                                                <ChevronDown className="h-4 w-4 ml-2 text-neutral-500 transition-transform group-open:rotate-180" />
                                                            </summary>
                                                            <div className="bg-neutral-950 text-neutral-300 border border-white/10 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[300px]">
                                                                <pre>{(() => {
                                                                    if (!trip.debugResponse) return "No debug response recorded.";
                                                                    try {
                                                                        const cleanJson = trip.debugResponse.replace(/```json\n?|\n?```/g, "").trim();
                                                                        return JSON.stringify(JSON.parse(cleanJson), null, 2);
                                                                    } catch (e) {
                                                                        return trip.debugResponse;
                                                                    }
                                                                })()}</pre>
                                                            </div>
                                                        </details>

                                                        {trip.debugPrompt && (
                                                            <details className="group">
                                                                <summary className="flex items-center cursor-pointer list-none mb-2 focus:outline-none">
                                                                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">AI Prompt (Full)</h4>
                                                                    <ChevronDown className="h-4 w-4 ml-2 text-neutral-500 transition-transform group-open:rotate-180" />
                                                                </summary>
                                                                <div className="bg-neutral-900 border border-white/10 text-neutral-400 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[300px]">
                                                                    <pre>{trip.debugPrompt}</pre>
                                                                </div>
                                                            </details>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

