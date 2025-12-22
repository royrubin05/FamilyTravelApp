"use client";

import { useEffect, useState } from "react";
import { getTrips, deleteTripAction } from "@/app/trip-actions";
import { normalizeLocationsAction } from "@/app/actions";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Trash2, RefreshCw, Wand2 } from "lucide-react";
import { isTripCompleted, parseTripDate } from "@/lib/dateUtils";

type AuditTrip = {
    id: string;
    destination: string;
    dates: string;
    status: "valid" | "warning" | "error";
    issues: string[];
    rawData: any;
};

export function DataAuditManager() {
    const [trips, setTrips] = useState<AuditTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [normalizing, setNormalizing] = useState(false);
    const [normalizationReport, setNormalizationReport] = useState<string | null>(null);

    const runAudit = async () => {
        setLoading(true);
        try {
            const rawTrips = await getTrips();
            const audited = rawTrips.map((t: any) => {
                const issues: string[] = [];
                let status: "valid" | "warning" | "error" = "valid";

                // Critical Errors
                if (!t.destination) {
                    issues.push("Missing Destination");
                    status = "error";
                }
                if (!t.dates) {
                    issues.push("Missing Dates");
                    status = "error";
                }
                if (parseTripDate(t.dates) === 0) {
                    issues.push("Unparseable Date");
                    status = "error";
                }

                // Warnings
                if (!t.image || t.image === "generic") {
                    issues.push("No Specific Image");
                    if (status !== "error") status = "warning";
                }
                if (!t.travelers || t.travelers.length === 0) {
                    issues.push("No Travelers");
                    if (status !== "error") status = "warning";
                }
                if ((!t.flights || t.flights.length === 0) && (!t.hotels || t.hotels.length === 0)) {
                    issues.push("No Flight/Hotel Details");
                    if (status !== "error") status = "warning";
                }

                // ID Check
                if (t.travelers && t.travelers.some((tr: any) => typeof tr === "string")) {
                    issues.push("Legacy String Travelers");
                    if (status !== "error") status = "warning";
                }

                return {
                    id: t.id,
                    destination: t.destination,
                    dates: t.dates,
                    status,
                    issues,
                    rawData: t
                };
            });
            setTrips(audited);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleNormalize = async () => {
        setNormalizing(true);
        setNormalizationReport(null);
        try {
            const result = await normalizeLocationsAction();
            if (result.success) {
                setNormalizationReport(result.report || "Normalization successful with no report.");
                runAudit(); // Refresh data
            } else {
                setNormalizationReport("Normalization failed: " + (result.error || "Unknown error"));
            }
        } catch (e) {
            setNormalizationReport("An unexpected error occurred.");
        } finally {
            setNormalizing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Are you sure you want to delete trip ${id}?`)) return;
        await deleteTripAction(id);
        runAudit();
    };

    useEffect(() => {
        runAudit();
    }, []);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-serif text-white">Data Integrity Audit</h3>
                    <p className="text-sm text-white/40">Review health and normalize data.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleNormalize}
                        disabled={normalizing}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Wand2 className={`h-4 w-4 ${normalizing ? "animate-spin" : ""}`} />
                        {normalizing ? "AI Normalizing..." : "Normalize Locations"}
                    </button>
                    <button
                        onClick={async () => {
                            if (!confirm("This will RESET the city image list to only match valid trips. Orphan images will be removed. Continue?")) return;
                            setNormalizing(true);
                            const { regenerateCityImagesAction } = await import("@/app/actions");
                            const res = await regenerateCityImagesAction();
                            setNormalizationReport(res.report || res.error || "Done");
                            setNormalizing(false);
                        }}
                        disabled={normalizing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${normalizing ? "animate-spin" : ""}`} />
                        Reset Images
                    </button>
                    <button
                        onClick={runAudit}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                </div>
            </header>

            {normalizationReport && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm whitespace-pre-wrap font-mono relative">
                    <button onClick={() => setNormalizationReport(null)} className="absolute top-2 right-2 text-white/40 hover:text-white"><XCircle className="h-4 w-4" /></button>
                    <h4 className="font-bold text-blue-300 mb-2">Normalization Report</h4>
                    {normalizationReport}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-white/30" />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">
                        <div className="bg-green-500/5 border border-green-500/10 p-3 rounded-lg text-center">
                            <h3 className="text-green-400 font-bold text-lg">{trips.filter(t => t.status === "valid").length}</h3>
                            <p className="text-[10px] uppercase tracking-wider text-green-500/50">Healthy</p>
                        </div>
                        <div className="bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg text-center">
                            <h3 className="text-yellow-400 font-bold text-lg">{trips.filter(t => t.status === "warning").length}</h3>
                            <p className="text-[10px] uppercase tracking-wider text-yellow-500/50">Warnings</p>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-lg text-center">
                            <h3 className="text-red-400 font-bold text-lg">{trips.filter(t => t.status === "error").length}</h3>
                            <p className="text-[10px] uppercase tracking-wider text-red-500/50">Errors</p>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs md:text-sm">
                            <thead className="bg-white/5 text-white/40 uppercase text-[10px]">
                                <tr>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Destination</th>
                                    <th className="p-3 hidden md:table-cell">Dates</th>
                                    <th className="p-3">Issues</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {trips.map(trip => (
                                    <tr key={trip.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3">
                                            {trip.status === "valid" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                            {trip.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                            {trip.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                                        </td>
                                        <td className="p-3 font-bold">{trip.destination || <span className="text-red-500 italic">Missing</span>}</td>
                                        <td className="p-3 hidden md:table-cell">{trip.dates || <span className="text-red-500 italic">Missing</span>}</td>
                                        <td className="p-3">
                                            {trip.issues.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {trip.issues.map((issue, i) => (
                                                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${issue.includes("Missing") ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
                                                            }`}>
                                                            {issue}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : <span className="text-white/20">-</span>}
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => handleDelete(trip.id)}
                                                className="p-1.5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded transition-colors"
                                                title="Delete Trip"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
