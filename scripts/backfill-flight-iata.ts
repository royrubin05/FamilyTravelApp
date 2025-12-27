
import { db as adminDb } from "../src/lib/firebase";

async function backfillAllFlights() {
    console.log("Starting Global Flight Backfill...");

    // Scan all users
    const usersSnap = await adminDb.collection("users").get();
    console.log(`Found ${usersSnap.size} users.`);

    let totalUpdated = 0;

    for (const userDoc of usersSnap.docs) {
        console.log(`Scanning user: ${userDoc.id}`);
        const tripsSnap = await userDoc.ref.collection("trips").get();
        console.log(`  Found ${tripsSnap.size} trips.`);

        for (const tripDoc of tripsSnap.docs) {
            const updated = await updateTrip(tripDoc.ref, tripDoc.data(), tripDoc.id);
            if (updated) totalUpdated++;
        }
    }

    console.log(`Backfill Complete. Updated ${totalUpdated} trips.`);
}

async function updateTrip(ref: any, data: any, tripId: string) {
    const flights = data.flights || [];
    let changed = false;

    const IATA_MAP: Record<string, string> = {
        "united": "UA",
        "el al": "LY",
        "delta": "DL",
        "american": "AA",
        "british": "BA",
        "lufthansa": "LH",
        "air canada": "AC",
        "air france": "AF",
        "swiss": "LX",
        "austrian": "OS",
        "brussels": "SN",
        "emirates": "EK",
        "qatar": "QR",
        "cathay": "CX",
        "singapore": "SQ",
        "turkish": "TK"
    };

    const newFlights = flights.map((f: any) => {
        let airlineLower = (f.airline || "").toLowerCase();
        let code = "";

        // Find code
        for (const [key, val] of Object.entries(IATA_MAP)) {
            if (airlineLower.includes(key)) {
                code = val;
                break;
            }
        }

        let newNumber = f.flightNumber;

        // Fix number only (e.g. "6") or just digits as string
        if (newNumber && !String(newNumber).match(/[a-zA-Z]/) && code) {
            console.log(`[${tripId}] Updating '${f.flightNumber}' to '${code} ${f.flightNumber}'`);
            changed = true;
            newNumber = `${code} ${f.flightNumber}`;
        }

        // Fix tight spacing (e.g. UA84 -> UA 84)
        if (typeof newNumber === 'string' && /^[A-Z]{2}\d+/.test(newNumber)) {
            const fixed = newNumber.replace(/([A-Z]{2})(\d+)/, '$1 $2');
            if (fixed !== newNumber) {
                console.log(`[${tripId}] Spacing fix: '${newNumber}' -> '${fixed}'`);
                changed = true;
                newNumber = fixed;
            }
        }

        return { ...f, flightNumber: newNumber };
    });

    if (changed) {
        await ref.update({ flights: newFlights });
        return true;
    }
    return false;
}

backfillAllFlights().catch(console.error);
