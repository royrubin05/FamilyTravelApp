"use client";

import { useState } from "react";
import { CheckCircle, XCircle, FileText, Download, Activity, Code, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function UploadLogList({ logs, isLoading }: { logs: any[], isLoading: boolean }) {
    if (isLoading) {
        return <div className="text-white/50 text-center py-20">Loading logs...</div>;
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                <Activity className="h-10 w-10 text-white/30 mx-auto mb-4" />
                <p className="text-white/50">No upload logs found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map(log => (
                <UploadLogItem key={log.id} log={log} />
            ))}
        </div>
    );
}

function UploadLogItem({ log }: { log: any }) {
    const [expanded, setExpanded] = useState(false);
    const isFailed = log.status === 'failed';

    return (
        <div className={`rounded-xl border transition-all duration-300 ${isFailed
                ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                : "bg-white/5 border-white/10 hover:border-white/20"
            }`}>
            <div
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`p-2 rounded-lg ${isFailed ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
                    {isFailed ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate">{log.fileName || "Unknown File"}</h3>
                        <span className="text-xs text-white/40 font-mono">
                            {log.id}
                        </span>
                        {log.isTest && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-[10px] font-bold uppercase tracking-wider">
                                TEST
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-white/60">
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        {log.userName && <span className="ml-2 text-white/40">• {log.userName}</span>}
                    </p>
                </div>

                {log.error && (
                    <div className="hidden md:block px-3 py-1 bg-red-500/20 rounded text-red-200 text-xs font-mono max-w-xs truncate">
                        {log.error}
                    </div>
                )}

                <button className="p-2 text-white/40 hover:text-white transition-colors">
                    {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-4 border-t border-white/5 mt-2">

                            {/* Error Banner if Failed */}
                            {log.error && (
                                <div className="bg-red-950/50 p-4 rounded-lg border border-red-500/20 text-red-200 font-mono text-sm whitespace-pre-wrap">
                                    <span className="font-bold text-red-500 block mb-1">Error:</span>
                                    {log.error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4">
                                {log.gcsUrl && (
                                    <a
                                        href={log.gcsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
                                    >
                                        <Download className="h-4 w-4" /> Download Original File
                                    </a>
                                )}
                            </div>

                            {/* Debug Info */}
                            {(log.debugPrompt || log.debugResponse) ? (
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 font-bold">
                                        <Code className="h-3 w-3" /> AI Debug Info
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {log.debugPrompt && (
                                            <div className="space-y-1">
                                                <span className="text-xs text-white/30">Prompt</span>
                                                <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-white/70 h-64 overflow-y-auto whitespace-pre-wrap">
                                                    {log.debugPrompt}
                                                </div>
                                            </div>
                                        )}
                                        {log.debugResponse && (
                                            <div className="space-y-1">
                                                <span className="text-xs text-white/30">Raw Response</span>
                                                <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-blue-300/80 h-64 overflow-y-auto whitespace-pre-wrap">
                                                    {log.debugResponse}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm italic">No AI debug info available.</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
