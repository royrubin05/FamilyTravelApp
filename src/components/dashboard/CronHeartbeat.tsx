"use client";

import { useEffect, useState } from "react";
import { getSystemHealthLogs } from "@/app/actions/system-health";
import { SystemHealthLog } from "@/lib/system-health";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Activity, CheckCircle2, XCircle, Clock, X } from "lucide-react";

export function CronHeartbeat() {
    const [logs, setLogs] = useState<SystemHealthLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const data = await getSystemHealthLogs();
            setLogs(data);
        } catch (err) {
            console.error("Failed to load cron logs", err);
        } finally {
            setLoading(false);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchLogs();

        // Auto-refresh every 30 seconds to keep it "heartbeat" like without realtime listeners
        const interval = setInterval(fetchLogs, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0) {
        return (
            <div className="animate-pulse flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/5 h-[200px]">
                <div className="h-6 w-32 bg-white/10 rounded mb-4"></div>
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 w-full bg-white/5 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    const LogsTable = ({ limit = 10 }: { limit?: number }) => (
        <div className="w-full">
            <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-white/30 pb-3 border-b border-white/5 mb-3">
                <div className="col-span-3">Time</div>
                <div className="col-span-6">Job</div>
                <div className="col-span-3 text-right">Status</div>
            </div>

            <div className="space-y-3">
                {logs.slice(0, limit).map((log) => (
                    <div key={log.id || log.timestamp} className="grid grid-cols-12 gap-4 items-center text-sm group hover:bg-white/5 rounded-lg p-1 transition-colors -mx-1">
                        <div className="col-span-3 text-white/60 font-mono text-xs whitespace-nowrap">
                            {formatDistanceToNow(parseISO(log.timestamp), { addSuffix: true }).replace("about ", "")}
                        </div>
                        <div className="col-span-6 font-medium text-white/90 truncate" title={log.job}>
                            {log.job.replace('/api/cron/', '')}
                        </div>
                        <div className="col-span-3 flex justify-end">
                            {log.status === 'Success' ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    200 OK
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                    <XCircle className="w-3 h-3" />
                                    ERR
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-white leading-none">Cron Heartbeat</h3>
                        <p className="text-xs text-white/40 mt-1">System Health Monitor</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider border border-transparent hover:border-white/10"
                    >
                        View History
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center text-white/30">
                            <Clock className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">No execution logs found.</p>
                        </div>
                    ) : (
                        <LogsTable limit={5} />
                    )}
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="relative w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-white">Execution History</h3>
                                    <p className="text-sm text-white/40">Full log of recent cron jobs</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            <LogsTable limit={100} />
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
