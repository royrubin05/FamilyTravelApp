
import { db as adminDb } from "../src/lib/firebase";

const TRIP_ID = "tel-aviv-2026-249711";

async function patchTrip() {
    console.log(`Patching trip: ${TRIP_ID}`);

    // Scan all users
    const usersSnap = await adminDb.collection("users").get();
    let found = false;

    console.log(`Scanning ${usersSnap.size} users...`);

    for (const userDoc of usersSnap.docs) {
        const tripRef = userDoc.ref.collection("trips").doc(TRIP_ID);
        const tripSnap = await tripRef.get();

        if (tripSnap.exists) {
            console.log(`Found trip in user: ${userDoc.id}`);
            await updateDoc(tripRef, tripSnap.data());
            found = true;
        }
    }

    if (!found) {
        // Fallback: Check top level just in case logic is mixed 
        console.log("Not found in user subcollections. Checking top-level 'trips'...");
        const docRef = adminDb.collection("trips").doc(TRIP_ID);
        const doc = await docRef.get();
        if (doc.exists) {
            console.log("Found in Top-Level 'trips'. Updating...");
            await updateDoc(docRef, doc.data());
        } else {
            console.error("Trip not found anywhere!");
        }
    }
}

async function updateDoc(ref: any, data: any) {
    const flights = data.flights || [];
    let updated = false;

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
        "brussels": "SN"
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
        if (newNumber && !String(newNumber).match(/[a-zA-Z]/)) {
            if (code) {
                console.log(`Updating ${f.flightNumber} to ${code} ${f.flightNumber}`);
                updated = true;
                newNumber = `${code} ${f.flightNumber}`;
            }
        }

        // Fix tight spacing (e.g. UA84 -> UA 84)
        if (typeof newNumber === 'string' && /^[A-Z]{2}\d+/.test(newNumber)) {
            const fixed = newNumber.replace(/([A-Z]{2})(\d+)/, '$1 $2');
            if (fixed !== newNumber) {
                console.log(`Spacing fix: ${newNumber} -> ${fixed}`);
                updated = true;
                newNumber = fixed;
            }
        }

        return { ...f, flightNumber: newNumber };
    });

    if (updated) {
        await ref.update({ flights: newFlights });
        console.log("Trip updated successfully.");
    } else {
        console.log("No changes needed (or no matching airlines found).");
    }
}

patchTrip().catch(console.error);
