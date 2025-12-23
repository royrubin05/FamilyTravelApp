export type TripFlight = {
    departure: string; // "Date Time (Code)" or just "Date Time"
    arrival: string;
    departureAirport?: string;
    arrivalAirport?: string;
    travelers?: string[];
};

export type Trip = {
    id: string;
    destination: string;
    flights?: TripFlight[];
    [key: string]: any;
};

// Extract code from string like "Dec 25 10:00 (JFK)" -> "JFK"
function extractCode(str: string): string | null {
    if (!str) return null;
    const match = str.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : null;
}

export function getTripRouteTitle(trip: Trip): string {
    // 1. If no flights, fallback to destination
    if (!trip.flights || trip.flights.length === 0) {
        return trip.destination;
    }

    // 2. Identify the full chain
    // We assume flights are sorted by time. If not, we should sort?
    // Let's assume they are roughly sorted.
    // Chain: origin -> stop -> ... -> destination -> ... -> origin

    // Simplification: We only care about the OUTBOUND leg to the main destination.
    // How to identify "Outbound"? Usually the first flight or set of flights.
    // Or we can just map the whole sequence of airports.

    const airports: string[] = [];

    // Get first flight origin
    const firstFlight = trip.flights[0];
    const origin = firstFlight.departureAirport || extractCode(firstFlight.departure) || "Origin";
    airports.push(origin);

    // Add all arrivals
    trip.flights.forEach(f => {
        const arrival = f.arrivalAirport || extractCode(f.arrival);
        if (arrival && arrival !== airports[airports.length - 1]) {
            airports.push(arrival);
        }
    });

    // 3. Filter for valid IATA codes (length 3, all caps) roughly
    // Or just trust the extraction.

    // 4. Identify the "Main Destination" in the chain.
    // Usually it's the airport where they stay the longest, or the one matching trip.destination.
    // But for a route string like "JFK -> LHR -> TLV", we want the path.

    // If it's a simple round trip (A -> B, B -> A), we want "A <-> B".
    // If it's multi-leg (A -> B -> C -> A), is it "A -> B -> C"?

    // Logic:
    // If [0] == [last], it's a loop (Round Trip).
    // Remove the return leg?

    // Let's look at unique airports visited in sequence.
    // Example: JFK -> LHR (stay) -> JFK.
    // Sequence: JFK, LHR, JFK.
    // We want: JFK <-> LHR.

    // Example: JFK -> LHR -> TLV (stay) -> LHR -> JFK.
    // Sequence: JFK, LHR, TLV, LHR, JFK.
    // We want: JFK -> LHR -> TLV (or JFK <-> TLV with stops?)
    // User requested: "Origin -> Stop -> Destination"

    // Strategy: Take the sequence up to the "furthest" point or simply the unique sequence excluding immediate return?
    // User examples:
    // "direct flight - Origin <-> Destination"
    // "two stops - Origin -> Stop -> Stop -> Destination"

    // Let's deduce the "Outbound Path".
    // Find the flight that arrives at the "trip.destination" (fuzzy match)?
    // Or just take the first N/2 flights?

    // Best Guess: The path is the sequence of airports until we reach the destination city.
    // But wait, "trip.destination" is "Paris". Airport is "CDG". We don't map them easily without a DB.

    // Alternative: Just take the first "half" of the trip?
    // Or just all airports excluding the return loop?

    // Let's try: unique airports in order.
    // JFK, LHR, JFK -> Unique: JFK, LHR. Count 2. -> Direct. "JFK <-> LHR".

    // JFK, LHR, TLV, LHR, JFK -> Unique: JFK, LHR, TLV. Count 3. 
    // Is it "JFK -> LHR -> TLV"? 
    // Yes.

    // JFK, EWR (technical stop?), LHR -> ... 
    // We might have noise.

    // Simple Heuristic:
    // 1. Get raw sequence: JFK, LHR, TLV, LHR, JFK.
    // 2. Remove the last element if it matches the first (return to origin).
    //    -> JFK, LHR, TLV, LHR
    // 3. Remove immediate back-tracking? (LHR -> ... -> LHR)

    // Let's try matching the User's explicit "Stops" logic.
    // "Stop" usually implies a connection (layover < 24h).
    // If layover > 24h, it's a multi-destination trip.

    // Given the difficulty of determining "Stop" vs "Destination" without times:
    // Let's just flatten the unique airports list (preserving order of first appearance).
    // JFK, LHR, TLV.
    // Route: JFK -> LHR -> TLV.

    // If count == 2 (JFK, LHR): "JFK <-> LHR".
    // If count > 2: "JFK -> LHR -> TLV".

    const uniqueAirports = Array.from(new Set(airports));

    if (uniqueAirports.length < 2) return trip.destination;

    const originCode = uniqueAirports[0];
    const destCode = uniqueAirports[uniqueAirports.length - 1];
    const stops = uniqueAirports.slice(1, -1);

    if (stops.length === 0) {
        // Direct
        return `${originCode} <-> ${destCode}`;
    } else {
        // Multi-leg / Stops
        // User asked for "Origin -> Stop -> Destination"
        // Also "three or more stops... Origin -> ... -> Destination"

        if (stops.length <= 2) {
            return `${originCode} -> ${stops.join(" -> ")} -> ${destCode}`;
        } else {
            return `${originCode} -> ... -> ${destCode}`;
        }
    }
}

export function getTripIcon(trip: any): string {
    const topology = trip.ai_summary?.topology || "";

    // 1. AI Topology Match
    if (topology === "One Way") return "/icons/one-way.jpg";
    if (topology === "Round Trip") return "/icons/round-trip.jpg";
    if (topology === "Multi-City" || topology === "Open Jaw") return "/icons/multi-city.jpg";

    // 2. Fallback Inference
    const flights = trip.flights || [];
    const hotels = trip.hotels || [];

    // Logic:
    // No flights, but has hotels -> Hotel Trip
    // No flights, no hotels -> Generic
    // Flights exist -> Check topology (One Way vs Round Trip vs Multi)

    if (flights.length === 0) {
        return hotels.length > 0 ? "/icons/hotel.jpg" : "/icons/generic.jpg";
    }

    if (flights.length === 1) return "/icons/one-way.jpg";

    // Check for Round Trip (Origin == Final Destination)
    const firstFlight = flights[0];
    const lastFlight = flights[flights.length - 1];

    // Helper to get airport code or city name, normalized
    const getLoc = (f: any, type: 'dep' | 'arr') => {
        const port = type === 'dep' ? f.departureAirport : f.arrivalAirport;
        const raw = type === 'dep' ? f.departure : f.arrival;
        if (port) return port.trim().toUpperCase();
        const code = extractCode(raw);
        if (code) return code;
        // Fallback to raw string comparison (risky but better than nothing if no codes)
        return raw ? raw.split("(")[0].trim().toLowerCase() : "";
    };

    const origin = getLoc(firstFlight, 'dep');
    const destination = getLoc(lastFlight, 'arr');

    if (origin && destination && origin === destination) {
        return "/icons/round-trip.jpg";
    }

    // If multiple flights but not round trip, assume Multi-City / Complex
    return "/icons/multi-city.jpg";
}
