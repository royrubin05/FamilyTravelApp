"use client";

import { useState, useEffect } from "react";
import { UploadLogList } from "@/components/admin/UploadLogList";
import { getAllUploadLogs, testTripParsing } from "@/app/admin/actions";
import { Upload, X, Loader2, FileJson, Bug, CheckCircle, XCircle, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminUploadsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const data = await getAllUploadLogs();
            setLogs(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Upload Logs</h1>
                    <p className="text-white/60">Inspect recent PDF upload attempts and failures.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsTestModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2"
                    >
                        <Bug className="h-4 w-4" /> Test Parser
                    </button>
                    <button
                        onClick={load}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <UploadLogList logs={logs} isLoading={loading} />

            <TestParserModal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                onComplete={() => {
                    load(); // Refresh logs to show the new test attempt
                }}
            />
        </div>
    );
}

function TestParserModal({ isOpen, onClose, onComplete }: { isOpen: boolean, onClose: () => void, onComplete: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await testTripParsing(formData);

            if (res.success) {
                setResult(res);
                onComplete();
            } else {
                setError(res.error || "Parsing failed");
                onComplete(); // Still log it
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-neutral-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Bug className="h-5 w-5 text-blue-400" /> Test PDF Parser
                            </h2>
                            <button onClick={onClose} className="text-white/50 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {!result && (
                                <div className="space-y-4">
                                    <div className="p-8 border-2 border-dashed border-white/10 rounded-xl text-center hover:border-white/30 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="test-file-upload"
                                        />
                                        <label htmlFor="test-file-upload" className="cursor-pointer">
                                            <Upload className="h-10 w-10 text-blue-400 mx-auto mb-4" />
                                            <p className="text-white font-medium mb-1">
                                                {file ? file.name : "Click to upload a PDF"}
                                            </p>
                                            <p className="text-white/40 text-sm">
                                                Upload a travel document to test the AI parser. Data will NOT be saved to the database.
                                            </p>
                                        </label>
                                    </div>

                                    {file && (
                                        <button
                                            onClick={handleUpload}
                                            disabled={isUploading}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Run Parser"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200">
                                    <p className="font-bold flex items-center gap-2">
                                        <XCircle className="h-5 w-5" /> Parsing Failed
                                    </p>
                                    <p className="mt-1 text-sm">{error}</p>
                                </div>
                            )}

                            {result && (
                                <div className="space-y-6">
                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-200">
                                        <p className="font-bold flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5" /> Parsing Successful
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-white/60 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <FileJson className="h-4 w-4" /> Extracted Data
                                        </h3>
                                        <div className="bg-black/50 p-4 rounded-xl text-xs font-mono text-green-300 overflow-x-auto">
                                            <pre>{JSON.stringify(result.data, null, 2)}</pre>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-white/60 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Code className="h-4 w-4" /> AI Debug Info
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <span className="text-xs text-white/30">Prompt</span>
                                                <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-white/50 h-40 overflow-y-auto whitespace-pre-wrap">
                                                    {result.debug?.prompt}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-xs text-white/30">Raw Response</span>
                                                <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-blue-300/60 h-40 overflow-y-auto whitespace-pre-wrap">
                                                    {result.debug?.response}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setResult(null);
                                            setFile(null);
                                            setError(null);
                                        }}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold"
                                    >
                                        Test Another File
                                    </button>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
