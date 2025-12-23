
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Next.js/Leaflet
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

// Custom Minimalist Icon
const customIcon = new L.Icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to auto-fit bounds
function MapBounds({ trips }: { trips: any[] }) {
    const map = useMap();

    useEffect(() => {
        if (trips.length > 0) {
            const bounds = new L.LatLngBounds([]);
            trips.forEach(t => {
                if (t.coordinates?.lat && t.coordinates?.lng) {
                    bounds.extend([t.coordinates.lat, t.coordinates.lng]);
                }
            });
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [trips, map]);

    return null;
}

export default function TripMap({ trips, onTripClick }: { trips: any[], onTripClick: (id: string) => void }) {
    // Filter only trips with valid coordinates
    const validTrips = trips.filter(t => t.coordinates?.lat && t.coordinates?.lng);

    return (
        <div className="w-full h-[600px] rounded-xl overflow-hidden shadow-2xl border border-white/10 z-0 relative">
            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: "100%", width: "100%", background: "#1a1a1a" }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapBounds trips={validTrips} />

                {validTrips.map(trip => (
                    <Marker
                        key={trip.id}
                        position={[trip.coordinates.lat, trip.coordinates.lng]}
                        icon={customIcon}
                        eventHandlers={{
                            click: () => onTripClick(trip.id),
                        }}
                    >
                        <Popup className="leaflet-popup-dark">
                            <div className="font-sans">
                                <strong>{trip.destination}</strong>
                                <br />
                                <span className="text-xs text-neutral-500">{trip.dates}</span>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
