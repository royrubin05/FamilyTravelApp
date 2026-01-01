
import { useMemo } from 'react';
import { parseTripDate, hasTripStarted } from '@/lib/dateUtils';

interface Traveler {
    id: string;
    name: string;
    nicknames?: string[];
}

interface Trip {
    id: string;
    destination: string;
    dates: string; // "MMM DD, YYYY - ..."
    flights?: Flight[];
    hotels?: Hotel[];
    travelers?: (string | { name: string })[];
}

interface Flight {
    airline: string;
    departure: string; // "Date Time (Airport)"
    arrival: string;
    duration?: string; // "11h 20m"
    distanceMiles?: string | number; // "5,400" or 5400
    travelers?: string[];
}

interface Hotel {
    name: string;
}

export function useTravelInsights(trips: Trip[], travelerFilter: string, yearFilter: string | 'all') {
    return useMemo(() => {
        let totalMiles = 0;
        let totalMinutes = 0;
        let hotelCount = 0;
        const countriesVisited = new Set<string>();
        const airlineCounts: Record<string, number> = {};
        const cityCounts: Record<string, number> = {};

        // 1. Filter Trips by Year
        const filteredTrips = trips.filter(trip => {
            const tripYear = new Date(parseTripDate(trip.dates)).getFullYear();
            if (yearFilter !== 'all' && tripYear !== parseInt(yearFilter)) return false;
            // Only include started trips (past or ongoing) to count stats
            if (!hasTripStarted(trip.dates)) return false;
            return true;
        });

        // 2. Aggregate Data
        filteredTrips.forEach(trip => {
            // Check if traveler was on this trip
            // We assume simple string match or object name match
            const wasOnTrip = travelerFilter === 'all' || (trip.travelers || []).some(t => {
                const tName = typeof t === 'string' ? t : t.name;
                // Naive match, in real app might need ID matching
                return tName?.toLowerCase().includes(travelerFilter.toLowerCase()) ||
                    travelerFilter.toLowerCase().includes(tName?.toLowerCase() || "");
            });

            if (!wasOnTrip) return;

            // Hotels
            if (trip.hotels) {
                hotelCount += trip.hotels.length;
            }

            // Countries (Naive inference from destination string)
            // e.g., "Paris, France" -> "France"
            const parts = trip.destination.split(',');
            if (parts.length > 1) {
                countriesVisited.add(parts[parts.length - 1].trim());
            } else {
                // Fallback for known cities if needed, or just count the destination as a unique place
                countriesVisited.add(trip.destination);
            }

            // Top City Tracking
            const city = parts[0].trim();
            cityCounts[city] = (cityCounts[city] || 0) + 1;

            // Flights
            if (trip.flights) {
                trip.flights.forEach(flight => {
                    // If traveler filter is active, check if they were on this flight
                    const onFlight = travelerFilter === 'all' ||
                        (flight.travelers || []).some(t => t.toLowerCase().includes(travelerFilter.toLowerCase()));

                    if (!onFlight) return;

                    // Calculate Miles
                    if (flight.distanceMiles) {
                        const m = typeof flight.distanceMiles === 'string'
                            ? parseInt(flight.distanceMiles.replace(/,/g, ''))
                            : flight.distanceMiles;
                        if (!isNaN(m)) totalMiles += m;
                    }

                    // Calculate Duration
                    if (flight.duration) {
                        const match = flight.duration.match(/(\d+)h\s*(\d+)?m?/);
                        if (match) {
                            const h = parseInt(match[1]) || 0;
                            const m = parseInt(match[2]) || 0;
                            totalMinutes += (h * 60) + m;
                        }
                    }

                    // Airline
                    if (flight.airline) {
                        airlineCounts[flight.airline] = (airlineCounts[flight.airline] || 0) + 1;
                    }
                });
            }
        });

        // 3. Derived Stats
        const totalHours = Math.round(totalMinutes / 60);

        // Top Airline
        let topAirlineName = "N/A";
        let topAirlineCount = 0;
        Object.entries(airlineCounts).forEach(([name, count]) => {
            if (count > topAirlineCount) {
                topAirlineCount = count;
                topAirlineName = name;
            }
        });

        // Top Destination
        let topDestName = "N/A";
        let topDestCount = 0;
        Object.entries(cityCounts).forEach(([name, count]) => {
            if (count > topDestCount) {
                topDestCount = count;
                topDestName = name;
            }
        });



        // 4. Quirky Text Generation (Fallback)
        const name = travelerFilter === 'all' ? "the family" : travelerFilter; // "the family" vs "Roy"
        const yearLabel = yearFilter === 'all' ? "Across all trips" : `In ${yearFilter}`;

        let fallbackText = "";

        // Define outside scope
        const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]);

        if (totalMiles === 0 && hotelCount === 0) {
            fallbackText = "No insights are collected yet.";
        } else {
            // Construct lists
            const top3Cities = sortedCities.slice(0, 3).map(([c]) => c).join(", ");

            fallbackText = `${yearLabel}, ${topAirlineCount > 0 ? name : "we"} covered ${totalMiles.toLocaleString()} miles and logged ${totalHours} hours in the sky. Their travels included ${hotelCount} hotel stays across destinations like ${top3Cities || "various places"}. ${topDestName !== "N/A" ? `${topDestName} was the clear favorite, visited ${topDestCount} times.` : ""}`;

            // Adjust pronouns if specific traveler
            if (travelerFilter !== 'all') {
                fallbackText = fallbackText.replace("Their travels", "Member travels").replace("the family", name);
                fallbackText = fallbackText.replace("Their travels", "The trips");
            }
        }

        return {
            totalMiles,
            totalHours,
            hotelCount,
            countryCount: countriesVisited.size,
            topAirline: { name: topAirlineName, count: topAirlineCount },
            topDestination: { name: topDestName, count: topDestCount },
            visitedCities: sortedCities.slice(0, 5).map(([c]) => c), // Return top 5 cities
            fallbackText,
            hasData: totalMiles > 0 || hotelCount > 0
        };

    }, [trips, travelerFilter, yearFilter]);
}

