// Google Cloud Storage Base URL
const GCS_BASE_URL = "https://storage.googleapis.com/travelapp05-travel-data/public/destinations";

export const DESTINATION_IMAGES: Record<string, string> = {
    "london": `${GCS_BASE_URL}/london.jpg`,
    "paris": `${GCS_BASE_URL}/paris.jpg`,
    "aspen": `${GCS_BASE_URL}/aspen.jpg`,
    "tel aviv": `${GCS_BASE_URL}/tel-aviv.png`, // Prioritizing the PNG version if present, or we can check
    "miami": `${GCS_BASE_URL}/miami-1766120214757.webp`,
    "desert hot springs": `${GCS_BASE_URL}/desert-hot-springs--ca-1766119256812.jpg`,

    "new york": `${GCS_BASE_URL}/new-york.jpg`,
    "tokyo": `${GCS_BASE_URL}/tokyo.jpg`,
    "rome": `${GCS_BASE_URL}/rome.jpg`,
    "berlin": `${GCS_BASE_URL}/berlin.jpg`,
    "amsterdam": `${GCS_BASE_URL}/amsterdam.jpg`
};

// A high-quality generic travel image (airplane wing or clouds)
export const GENERIC_FALLBACK = `${GCS_BASE_URL}/generic-travel.jpg`;

export function getDestinationImage(destination: string | undefined): string {
    if (!destination) return GENERIC_FALLBACK;

    const key = destination.toLowerCase().trim();

    // Check direct match or partial match for mapped cities
    for (const [city, url] of Object.entries(DESTINATION_IMAGES)) {
        if (key.includes(city)) {
            return url;
        }
    }

    return GENERIC_FALLBACK;
}

// Helper to generate candidate keys for image lookup (e.g. "Los Angeles, CA" -> ["los angeles, ca", "los angeles"])
export function getNormalizedKeys(destination: string): string[] {
    if (!destination) return [];
    const clean = destination.toLowerCase().trim();
    const keys = [clean];

    // Attempt to strip state/country (e.g. "Los Angeles, CA" -> "Los Angeles")
    if (clean.includes(",")) {
        const cityOnly = clean.split(",")[0].trim();
        if (cityOnly && cityOnly !== clean) {
            keys.push(cityOnly);
        }
    }
    return keys;
}
