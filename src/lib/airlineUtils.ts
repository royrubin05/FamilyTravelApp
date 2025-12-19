export function getCheckInUrl(airline: string, confirmation?: string): string | null {
    if (!airline) return null;
    const lower = airline.toLowerCase();

    // Mapping Strategy: Keyword matching -> Homepage links (more stable than deep links)
    if (lower.includes("american airlines") || lower.includes("(aa)")) {
        return "https://www.aa.com";
    }
    if (lower.includes("united") || lower.includes("(ua)")) {
        return "https://www.united.com";
    }
    if (lower.includes("el al") || lower.includes("(ly)")) {
        return "https://www.elal.com";
    }
    if (lower.includes("delta") || lower.includes("(dl)")) {
        return "https://www.delta.com";
    }
    if (lower.includes("jetblue") || lower.includes("(b6)")) {
        return "https://www.jetblue.com";
    }
    if (lower.includes("southwest") || lower.includes("(wn)")) {
        return "https://www.southwest.com";
    }
    if (lower.includes("british airways") || lower.includes("(ba)")) {
        return "https://www.britishairways.com";
    }
    if (lower.includes("lufthansa") || lower.includes("(lh)")) {
        return "https://www.lufthansa.com";
    }
    if (lower.includes("air france") || lower.includes("(af)")) {
        return "https://www.airfrance.us";
    }

    return null;
}
