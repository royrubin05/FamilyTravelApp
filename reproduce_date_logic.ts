
const parseTripDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    const lower = dateStr.toLowerCase();

    const yearMatch = lower.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    if (lower.includes("spring")) return new Date(year, 2, 20).getTime();
    if (lower.includes("summer")) return new Date(year, 5, 21).getTime();
    if (lower.includes("fall") || lower.includes("autumn")) return new Date(year, 8, 22).getTime();
    if (lower.includes("winter")) return new Date(year, 11, 21).getTime();

    let startPart = dateStr.split("-")[0].trim();
    let timestamp = Date.parse(startPart);

    if (isNaN(timestamp) || !startPart.match(/\d{4}/)) {
        timestamp = Date.parse(`${startPart} ${year}`);
    }

    return isNaN(timestamp) ? 0 : timestamp;
};

const isTripCompleted = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const now = new Date().getTime();

    if (dateStr.trim().match(/^\d{4}$/)) {
        const year = parseInt(dateStr.trim());
        const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime();
        return endOfYear < now;
    }

    if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length > 1) {
            let endPart = parts[1].trim();
            const yearMatch = dateStr.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

            let endTimestamp = Date.parse(endPart);
            if (isNaN(endTimestamp) || !endPart.match(/\d{4}/)) {
                endTimestamp = Date.parse(`${endPart} ${year}`);
            }

            if (!isNaN(endTimestamp)) {
                console.log(`Range detected. End Part: "${endPart}", Parsed TS: ${endTimestamp} (${new Date(endTimestamp).toISOString()}), Now: ${now} (${new Date(now).toISOString()})`);
                return endTimestamp < now;
            }
        }
    }

    const startTimestamp = parseTripDate(dateStr);
    return startTimestamp > 0 && startTimestamp < now;
};

const testStr1 = "Jan 04, 2026 - May 27, 2026";
const testStr2 = "Jan 1, 2006";

console.log(`Test 1: "${testStr1}" -> Completed? ${isTripCompleted(testStr1)}`);
console.log(`Test 2: "${testStr2}" -> Completed? ${isTripCompleted(testStr2)}`);
