export interface Trip {
    id: string;
    destination: string;
    dates: string;
    image?: string;
    flights?: any[];
    hotels?: any[];
    activities?: any[];
    travelers?: any[];
    sourceDocument?: string;
    sourceFileName?: string;
    uploadedAt?: string;
    debugPrompt?: string;
    debugResponse?: string;
    matched_city_key?: string;
}

export interface TripGroup {
    id: string;
    ids: string[]; // Array of trip IDs belonging to this group
    title: string; // e.g., "East Coast Roadtrip"
    startDate: string; // ISO or formatted date string
    endDate: string; // ISO or formatted date string
    image?: string; // Cover image for the whole group
    createdAt?: string;
}
