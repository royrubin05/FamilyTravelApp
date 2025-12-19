"use client";

import { useState } from "react";
import { uploadCityImage } from "@/app/image-actions";
import { useTrips } from "@/context/TripContext";
import { Upload, X, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CityImageManagerProps {
    isOpen: boolean;
    onClose: () => void;
    initialImages: Record<string, string>;
    onUpdate?: (city: string, url: string) => void;
    embedded?: boolean;
}

export function CityImageManager({ isOpen, onClose, initialImages, onUpdate, embedded }: CityImageManagerProps) {
    const { trips } = useTrips();
    const [images, setImages] = useState(initialImages);
    const [uploadingCity, setUploadingCity] = useState<string | null>(null);

    // Collect all unique destinations from trips, preferring the normalized key
    const tripCities = new Set(trips.map(t => (t.matched_city_key || t.destination || "").toLowerCase().trim()));
    // Also include cities we have images for, even if not in current trips
    Object.keys(images).forEach(k => tripCities.add(k));
    tripCities.delete(""); // Remove empty

    const cities = Array.from(tripCities).sort();

    const handleUpload = async (city: string, file: File) => {
        setUploadingCity(city);
        const formData = new FormData();
        formData.append("city", city);
        formData.append("file", file);

        const result = await uploadCityImage(formData);

        if (result.success && result.imagePath) {
            setImages(prev => ({ ...prev, [city]: result.imagePath! }));
            if (onUpdate) onUpdate(city, result.imagePath!);
        } else {
            alert("Failed to upload image");
        }
        setUploadingCity(null);
    };

    if (!isOpen && !embedded) return null; // Only return null if not embedded and not open

    const content = (
        <div className={`space-y-4 text-white ${embedded ? 'h-full' : 'flex-1 overflow-y-auto p-6'}`}>
            {cities.map(city => {
                const hasImage = !!images[city];

                return (
                    <div key={city} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="h-16 w-24 bg-black rounded-lg overflow-hidden flex-shrink-0 relative group">
                            {hasImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={images[city]} alt={city} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-white/5">
                                    <ImageIcon className="h-6 w-6 text-white/20" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white capitalize">{city}</h3>
                            <p className="text-xs text-white/40">
                                {hasImage ? "Custom Image Set" : "Using Default / Missing"}
                            </p>
                        </div>

                        <div>
                            <input
                                type="file"
                                id={`upload-${city}`}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleUpload(city, e.target.files[0]);
                                }}
                                disabled={!!uploadingCity}
                            />
                            <label
                                htmlFor={`upload-${city}`}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${hasImage ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {uploadingCity === city ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Upload className="h-3 w-3" />
                                )}
                                {hasImage ? "Change" : "Upload"}
                            </label>
                        </div>
                    </div>
                );
            })}

            {cities.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    No cities found in your trips.
                </div>
            )}
        </div>
    );

    if (embedded) return content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-serif text-white">City Image Library</h2>
                        <p className="text-sm text-white/50">Manage photos for your destinations</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {content}
            </motion.div>
        </div>
    );
}
