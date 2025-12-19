"use client";

import { useState } from "react";
import { X, Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (tripData: any) => void;
}

export function UploadTripModal({ isOpen, onClose, onUploadComplete }: UploadTripModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<"idle" | "uploading" | "parsing" | "complete">("idle");

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file: File) => {
        setStatus("uploading");

        // Simulate Upload
        setTimeout(() => {
            setStatus("parsing");

            // Simulate AI Parsing
            setTimeout(() => {
                setStatus("complete");

                // Mock Result
                const newTrip = {
                    id: `tokyo-${Date.now()}`,
                    destination: "TOKYO",
                    dates: "Summer 2025",
                    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1994&auto=format&fit=crop",
                    travelers: [
                        { id: "dad", name: "Dad", role: "Organizer", card: null },
                        { id: "mom", name: "Mom", role: "Traveler", card: null }
                    ]
                };

                // Delay closing to show success state
                setTimeout(() => {
                    onUploadComplete(newTrip);
                    handleClose();
                }, 1000);

            }, 2000);
        }, 1000);
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
                className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
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
                                <p className="text-xs text-white/50 mt-1">Trip "Tokyo" has been added to your dashboard.</p>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

            </motion.div>
        </div>
    );
}
