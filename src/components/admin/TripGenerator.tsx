"use client";

import { useState } from "react";
import { prepareGeneratorResources, generateAndSaveTrip } from "@/app/admin/generator-actions";
import { Loader2, Sparkles, Wand2, CheckCircle, AlertTriangle, Trash2, Shield } from "lucide-react";

export function TripGenerator() {
    const [quantity, setQuantity] = useState(1);
    const [month, setMonth] = useState("January");
    const [year, setYear] = useState("2026");
    const [isGenerating, setIsGenerating] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ success: boolean; count?: number; error?: string; logs?: string[] } | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setLogs([]);
        setProgress(0);
        setResult(null);

        try {
            // 1. Prepare
            setLogs(prev => [...prev, "Checking requirements (User, Seed Trip)..."]);

            // Using static import function directly
            const prep = await prepareGeneratorResources();

            if (!prep.success || !prep.data) {
                setResult({ success: false, error: prep.error });
                setLogs(prev => [...prev, `Error: ${prep.error}`]);
                setIsGenerating(false);
                return;
            }

            const { seedJson, memberNames, testUserUid } = prep.data;
            setLogs(prev => [...prev, "Ready to generate. Seed trip found."]);

            let successCount = 0;
            const cleanLogs: string[] = [];

            // 2. Loop
            for (let i = 0; i < quantity; i++) {
                // Update Progress
                setProgress(Math.round(((i) / quantity) * 100));
                setLogs(prev => [...prev, `Generating trip ${i + 1}/${quantity}...`]);

                // Generate
                const res = await generateAndSaveTrip(seedJson, memberNames, testUserUid, month, year, i);

                if (res.success) {
                    successCount++;
                    setLogs(prev => [...prev, `✅ ${res.log}`]);
                    cleanLogs.push(res.log);
                } else {
                    setLogs(prev => [...prev, `❌ ${res.log}`]);
                }

                // Throttle slightly to be nice to API
                await new Promise(r => setTimeout(r, 500));
            }

            setProgress(100);
            setResult({ success: true, count: successCount, logs: cleanLogs });

        } catch (e: any) {
            setResult({ success: false, error: e.message });
            setLogs(prev => [...prev, `Fatal Error: ${e.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6 relative">
                <div className="absolute -left-8 md:-left-10 text-neutral-600 font-mono text-xs rotate-180 bg-neutral-900 border border-neutral-800 px-1 py-4 rounded writing-mode-vertical">
                    DEV TOOL
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sparkles className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Fake Trip Generator</h2>
                    <p className="text-white/40 text-sm">Create randomized test data for staging.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Controls */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs uppercase text-white/40 font-bold tracking-widest mb-2">Quantity</label>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={Number.isNaN(quantity) ? "" : quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setQuantity(val);
                            }}
                            className="w-full bg-neutral-800 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-white/40 font-bold tracking-widest mb-2">Month</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-full bg-neutral-800 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-white/40 font-bold tracking-widest mb-2">Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full bg-neutral-800 border border-white/10 text-white text-sm rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            {["2024", "2025", "2026", "2027", "2028", "2029", "2030"].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Generating {progress}%...</span>
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-5 w-5" />
                                <span>Generate Trips</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm("Are you sure you want to delete ALL test trips for test_family?")) return;
                            setIsGenerating(true);
                            setLogs(prev => [...prev, "Deleting all test trips..."]);
                            const { deleteAllTestTrips } = await import("@/app/admin/generator-actions");
                            const res = await deleteAllTestTrips();
                            if (res.success) {
                                setLogs(prev => [...prev, `✅ ${res.message}`]);
                            } else {
                                setLogs(prev => [...prev, `❌ Delete Failed: ${res.message}`]);
                            }
                            setIsGenerating(false);
                        }}
                        disabled={isGenerating}
                        className="px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition-all flex items-center justify-center"
                        title="Delete All Test Trips"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>

                    <button
                        onClick={async () => {
                            if (!confirm("Seed 'admin@travelroots.internal' account?")) return;
                            setIsGenerating(true);
                            setLogs(prev => [...prev, "Seeding Admin User..."]);
                            const { seedAdminUser } = await import("@/app/admin/generator-actions");
                            const res = await seedAdminUser();
                            if (res.success) {
                                setLogs(prev => [...prev, `✅ ${res.message}`]);
                            } else {
                                setLogs(prev => [...prev, `❌ Seed Failed: ${res.message}`]);
                            }
                            setIsGenerating(false);
                        }}
                        disabled={isGenerating}
                        className="px-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-xl transition-all flex items-center justify-center"
                        title="Seed Admin User"
                    >
                        <Shield className="h-5 w-5" />
                    </button>
                </div>

                {/* Status Logs */}
                {(logs.length > 0 || result) && (
                    <div className="bg-black/50 rounded-xl p-4 border border-white/10 max-h-[300px] overflow-y-auto font-mono text-xs">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 ${log.includes('✅') ? 'text-green-400' : log.includes('❌') || log.includes('Error') ? 'text-red-400' : 'text-white/50'}`}>
                                {log}
                            </div>
                        ))}
                        {result?.success && (
                            <div className="mt-2 pt-2 border-t border-white/10 text-green-400 font-bold">
                                Done! Created {result.count} trips.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}
