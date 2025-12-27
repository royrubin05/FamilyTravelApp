"use client";

import { useState } from "react";
import { X, Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseTripDocument } from "@/app/actions";
import { saveTrip } from "@/app/trip-actions";

interface UploadTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (tripData: any) => void;
}

export function UploadTripModal({ isOpen, onClose, onUploadComplete }: UploadTripModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<"idle" | "uploading" | "parsing" | "complete" | "error">("idle");

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = async (file: File) => {
        setStatus("uploading");
        const formData = new FormData();
        formData.append("file", file);

        try {
            setStatus("parsing");
            const result = await parseTripDocument(formData);

            if (result.error) {
                console.error(result.error);
                setStatus("error");
                return;
            }

            if (result.success && result.tripId) {
                setStatus("complete");
                // Redirect
                setTimeout(() => {
                    onClose();
                    window.location.href = `/trip?id=${result.tripId}`;
                }, 1000);
            } else {
                setStatus("error");
            }

        } catch (e) {
            console.error(e);
            setStatus("error");
        }
    };

    const handleClose = () => {
        setStatus("idle");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85dvh] overflow-y-auto"
            >
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-xl font-serif text-white tracking-wide">Import Trip</h2>
                    <p className="text-sm text-white/50 mt-1">Upload your itinerary PDF to parse data.</p>
                </div>

                <div className="relative">
                    <AnimatePresence mode="wait">

                        {/* Idle State */}
                        {status === "idle" && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
                                }}
                            >
                                <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <Upload className="h-6 w-6 text-white/70" />
                                </div>
                                <p className="text-sm text-white/70 font-medium">Click to upload or drag & drop</p>
                                <p className="text-xs text-white/40 mt-2">PDF, EML, or verify email forwarding</p>

                                <input
                                    type="file"
                                    accept=".pdf,.eml"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </motion.div>
                        )}

                        {/* Parsing State */}
                        {(status === "uploading" || status === "parsing") && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="py-10 text-center"
                            >
                                <div className="relative mx-auto w-16 h-16 mb-4">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-t-2 border-r-2 border-blue-500 rounded-full"
                                    />
                                    <div className="absolute inset-2 bg-blue-500/20 rounded-full blur-md" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-blue-400" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-1">
                                    {status === "uploading" ? "Uploading Document..." : "AI Parsing..."}
                                </h3>
                                <p className="text-xs text-white/40">Analyzing dates, locations, and reservations</p>
                            </motion.div>
                        )}

                        {/* Complete State */}
                        {status === "complete" && (
                            <motion.div
                                key="complete"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-10 text-center"
                            >
                                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 text-green-400">
                                    <CheckCircle className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-medium text-white">Parser Successful!</h3>
                                <p className="text-xs text-white/50 mt-1">Trip added to your dashboard.</p>
                            </motion.div>
                        )}

                        {/* Error State */}
                        {status === "error" && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-10 text-center"
                            >
                                <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-500">
                                    <X className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-medium text-white">Parsing Failed</h3>
                                <p className="text-xs text-white/50 mt-1 max-w-[200px] mx-auto">Could not extract data. Check API Key or file format.</p>
                                <button
                                    onClick={() => setStatus("idle")}
                                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

            </motion.div>
        </div>
    );
}
