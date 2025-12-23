
const fs = require('fs');
const path = require('path');

// Mock extractCode since we don't want to import the whole file if it has other deps
function extractCode(str: string): string | null {
    if (!str) return null;
    const match = str.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : null;
}

// Copy-paste the function to test it in isolation without TS compilation issues for a quick script
function getTripIcon(trip: any): string {
    const topology = trip.ai_summary?.topology || "";

    // 1. AI Topology Match
    if (topology === "One Way") return "/icons/one-way.jpg";
    if (topology === "Round Trip") return "/icons/round-trip.jpg";
    if (topology === "Multi-City" || topology === "Open Jaw") return "/icons/multi-city.jpg";

    // 2. Fallback Inference
    const flights = trip.flights || [];
    const hasHotels = trip.hotels && trip.hotels.length > 0;

    if (flights.length === 0) {
        return hasHotels ? "/icons/hotel.jpg" : "/icons/generic.jpg";
    }

    if (flights.length === 1) return "/icons/one-way.jpg";

    // Check for Round Trip (Origin == Final Destination)
    const firstFlight = flights[0];
    const lastFlight = flights[flights.length - 1];

    const origin = firstFlight.departureAirport || extractCode(firstFlight.departure);
    const destination = lastFlight.arrivalAirport || extractCode(lastFlight.arrival);

    if (origin && destination && origin === destination) {
        return "/icons/round-trip.jpg";
    }

    // If multiple flights but not round trip, assume Multi-City / Complex
    return "/icons/multi-city.jpg";
}

const tripsDataPath = path.join(__dirname, 'src/data/trips.json');
const trips = JSON.parse(fs.readFileSync(tripsDataPath, 'utf8'));

const targetId = "desert-hot-springs-ca-2026-01-08";
const trip = trips.find((t: any) => t.id === targetId);

if (!trip) {
    console.log(`Trip ${targetId} not found in trips.json`);
} else {
    console.log(`Testing Trip: ${trip.id}`);
    console.log(`Flights: ${trip.flights ? trip.flights.length : 'undefined'}`);
    console.log(`Hotels: ${trip.hotels ? trip.hotels.length : 'undefined'}`);

    const icon = getTripIcon(trip);
    console.log(`Resulting Icon: ${icon}`);
}
