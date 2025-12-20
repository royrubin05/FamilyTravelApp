import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

import { getFirestore } from 'firebase-admin/firestore';

// Note: Ensure GOOGLE_APPLICATION_CREDENTIALS is set before running
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'travelapp05'
    });
}

// Try connecting to the named database
const db = getFirestore(admin.app(), 'travelapp05');

async function migrate() {
    console.log("🚀 Starting Firestore Migration...");

    // 1. Settings
    const settingsPath = path.join(process.cwd(), 'src/data/settings.json');
    if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        await db.collection('settings').doc('global').set(settings);
        console.log("✅ Settings migrated.");
    }

    // 2. Trips
    const tripsPath = path.join(process.cwd(), 'src/data/trips.json');
    if (fs.existsSync(tripsPath)) {
        const trips = JSON.parse(fs.readFileSync(tripsPath, 'utf8'));
        const batch = db.batch();
        let count = 0;

        for (const trip of trips) {
            const ref = db.collection('trips').doc(trip.id);
            // Ensure no undefined values (Firestore rejects them)
            const cleanTrip = JSON.parse(JSON.stringify(trip));
            batch.set(ref, cleanTrip);
            count++;
        }
        await batch.commit();
        console.log(`✅ ${count} Trips migrated.`);
    }

    // 3. City Images
    const imagesPath = path.join(process.cwd(), 'src/data/cityImages.json');
    if (fs.existsSync(imagesPath)) {
        const images = JSON.parse(fs.readFileSync(imagesPath, 'utf8'));
        // Store as a single document 'mapping' or individual docs?
        // Individual docs scales better if list is huge, but single doc is easier for "get all".
        // Let's go with single doc for now to match current usage (Config-like).
        await db.collection('city_images').doc('mapping').set(images);
        console.log("✅ City Images migrated.");
    }
}

migrate()
    .then(() => {
        console.log("🎉 Migration Complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    });
