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
    const now = new Date().getTime();

    // Special Case: Year Only "2025" -> Treat as End of Year
    // Restored since we removed the AI auto-expansion rule.
    if (dateStr.trim().match(/^\d{4}$/)) {
        const year = parseInt(dateStr.trim());
        const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime();
        return endOfYear < now;
    }

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
                // Set to End of Day (23:59:59.999)
                const d = new Date(endTimestamp);
                d.setHours(23, 59, 59, 999);
                return d.getTime() < now;
            }
        }
    }

    // Fallback: Use parseTripDate logic (start date)
    // Treating single date trips as "All Day" -> Completed only after that day ends.
    const startTimestamp = parseTripDate(dateStr);

    if (startTimestamp > 0) {
        const d = new Date(startTimestamp);
        d.setHours(23, 59, 59, 999);
        return d.getTime() < now;
    }

    return false;
};

/**
 * Determines if a trip has started (is in the past or currently active).
 */
export const hasTripStarted = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const now = new Date().getTime();
    const startTimestamp = parseTripDate(dateStr);
    return startTimestamp > 0 && startTimestamp < now;
};
