
function normalizeForMatch(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseAirlineFormat(name: string): string | null {
    // Check for LAST/FIRST format
    if (name.includes('/')) {
        const parts = name.split('/');
        if (parts.length >= 2) {
            const last = parts[0];
            // Remove title suffixes from First Name (MR, MRS, MS, MSTR)
            // Be careful not to remove names that end in these letters, so check for word boundary if possible,
            // or just trailing space-delimited.
            // Airline formats: "RUBIN/GILSHALOM MR"
            let first = parts[1];

            // Basic title stripping: split by space, if last part is a title, drop it.
            const firstParts = first.split(' ').filter(p => p.trim().length > 0);
            const titles = ['MR', 'MRS', 'MS', 'MISS', 'MSTR', 'DR', 'PROF'];

            if (firstParts.length > 1 && titles.includes(firstParts[firstParts.length - 1].toUpperCase())) {
                firstParts.pop(); // Remove title
            }
            first = firstParts.join(' ');

            return `${first} ${last}`;
        }
    }
    return null;
}

const members = [
    { name: "Niv Goldman" },
    { name: "Matan Rubin-Goldman" },
    { name: "Gil Shalom Rubin" },
    { name: "Roy Rubin" }
];

const inputs = [
    "GOLDMAN/NIV",
    "RUBINGOLDMAN/MATAN",
    "RUBIN/GILSHALOM",
    "RUBIN/GILSHALOM MR",
    "RUBIN/ROY",
    "UNKNOWN/PERSON"
];

console.log("--- Testing Matching Logic ---");

inputs.forEach(input => {
    let matchFound = false;
    let method = "";

    // 1. Direct Match (Old Logic)
    const lowerInput = input.toLowerCase();
    const exact = members.find(m => m.name.toLowerCase() === lowerInput);

    if (exact) {
        matchFound = true;
        method = "Exact";
        console.log(`[${method}] '${input}' -> '${exact.name}'`);
    } else {
        // 2. Airline Format Swap + Fuzzy
        const airlineName = parseAirlineFormat(input);
        if (airlineName) {
            // Try matching airlineName ("Niv Goldman") against members
            // Strategy: Strip both and compare
            const strippedAirline = normalizeForMatch(airlineName);

            const fuzzy = members.find(m => {
                const strippedMember = normalizeForMatch(m.name);
                return strippedMember === strippedAirline;
            });

            if (fuzzy) {
                matchFound = true;
                method = "Airline+Fuzzy";
                console.log(`[${method}] '${input}' -> '${airlineName}' -> '${fuzzy.name}'`);
            } else {
                console.log(`[Failed] '${input}' (Parsed: '${airlineName}')`);
            }
        } else {
            console.log(`[Failed] '${input}' (Not airline format)`);
        }
    }
});
