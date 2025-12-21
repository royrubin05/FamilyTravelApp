/**
 * Helper to parse vague date strings into a sortable timestamp
 */
export const parseTripDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    const lower = dateStr.toLowerCase();

    // 1. Handle Seasons (e.g., "Spring 2025")
    const yearMatch = lower.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    if (lower.includes("spring")) return new Date(year, 2, 20).getTime(); // Mar 20
    if (lower.includes("summer")) return new Date(year, 5, 21).getTime(); // Jun 21
    if (lower.includes("fall") || lower.includes("autumn")) return new Date(year, 8, 22).getTime(); // Sep 22
    if (lower.includes("winter")) return new Date(year, 11, 21).getTime(); // Dec 21

    // 2. Handle Ranges (e.g., "Oct 12 - Oct 27") -> Take start
    // If it's a range "Oct 12 - Oct 27", we sort by start date.
    let startPart = dateStr.split("-")[0].trim();

    // 3. Try parsing
    let timestamp = Date.parse(startPart);

    // If invalid or missing year, try appending current year (if not present)
    if (isNaN(timestamp) || !startPart.match(/\d{4}/)) {
        // Retry with year appended
        timestamp = Date.parse(`${startPart} ${year}`);
    }

    return isNaN(timestamp) ? 0 : timestamp;
};

/**
 * Determines if a trip is completed based on its date string.
 * Uses the END date of a range if possible, otherwise defaults to start date logic.
 */
export const isTripCompleted = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const lower = dateStr.toLowerCase();
    const now = new Date().getTime();

    // Check for ranges "Oct 12 - Oct 27" -> Parse the END part
    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length > 1) {
            let endPart = parts[1].trim();

            // Extract year from full string if endPart lacks it
            const yearMatch = dateStr.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

            let endTimestamp = Date.parse(endPart);
            if (isNaN(endTimestamp) || !endPart.match(/\d{4}/)) {
                endTimestamp = Date.parse(`${endPart} ${year}`);
            }

            if (!isNaN(endTimestamp)) {
                // Return true if end date is in the past
                return endTimestamp < now;
            }
        }
    }

    // Fallback: Use parseTripDate logic (start date)
    // If it's a single date "Spring 2025" or "Oct 25"
    // Ideally "Spring 2025" implies the whole season.
    // Let's stick to simple: if sortable start date is significantly in past?
    // Actually, simply checking if START date is in past is usually "In Progress" or "Completed".
    // Let's use start date + typical duration (e.g. 7 days) if no range?
    // Or just strictly: If start date is in past -> Completed? No, might be active.

    // For now: "Completed" means the entire trip is in the past.
    // If we only have start date, let's assume it's completed if start date is < now - 7 days?
    // Or just simplistic: < now.

    const startTimestamp = parseTripDate(dateStr);
    // If start timestamp is valid and passed
    return startTimestamp > 0 && startTimestamp < now;
};
