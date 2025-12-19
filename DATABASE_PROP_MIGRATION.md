# Database Migration Plan: Local JSON → Google Cloud Firestore

## Recommendation: Use Google Cloud Firestore

Since your app currently uses `trips.json` (a list of objects) and specific key-value stores (`cityImages.json`), **Firestore** is the perfect fit.

### Why Firestore?
1.  **Data Structure Match**: Firestore is a NoSQL, document-based database. Your JSON objects map 1:1 to Firestore Documents. No strict schema migration needed.
2.  **Serverless**: No servers to manage, scales to zero (cheap/free for low traffic).
3.  **Real-time Capable**: If you ever want "live" updates on the dashboard.
4.  **Integration**: First-class support in Google Cloud Run (automatic authentication).

---

## 🚀 The Plan

### Phase 1: Setup
1.  Enable **Firestore API** in Google Cloud Console.
2.  Create a standardized **Native** database in `us-central1`.
3.  Add `firebase-admin` package to your project:
    ```bash
    npm install firebase-admin
    ```

### Phase 2: Refactoring Code (The "How-To")

The goal is to replace `fs.readFile` with `db.collection(...).get()`.

#### 1. Create a DB Connection Helper (`src/lib/db.ts`)
```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp(); // Uses Google Application Default Credentials automatically on Cloud Run
}

export const db = getFirestore();
```

#### 2. Refactor `trip-actions.ts`
Instead of reading a file, you fetch documents.

**Current (File System):**
```typescript
const fileContent = await fs.readFile(TRIPS_FILE, "utf-8");
const trips = JSON.parse(fileContent);
```

**New (Firestore):**
```typescript
import { db } from "@/lib/db";

// Fetching
const snapshot = await db.collection('trips').orderBy('startDate', 'desc').get();
const trips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// Saving
await db.collection('trips').doc(newTrip.id).set(newTrip);
```

### Phase 3: Data Migration Script
You will need a one-time script to push your existing `trips.json` to Firestore.

```typescript
// scripts/migrate-to-firestore.ts
import { db } from "../src/lib/db";
import trips from "../src/data/trips.json";

async function migrate() {
    for (const trip of trips) {
        await db.collection('trips').doc(trip.id).set(trip);
        console.log(`Migrated ${trip.destination}`);
    }
}
```

### Comparison

| Feature | Local JSON (Current) | Firestore (New) |
| :--- | :--- | :--- |
| **Reads** | Loads ALL trips into memory | Can query active/recent trips only |
| **Writes** | Overwrites HUGE file safely | Updates single record instantly |
| **Search** | Javascript `.filter()` | Database Queries (`where("city", "==", "Paris")`) |
| **Cost** | Free | Free tier is generous (50k reads/day) |

---

## Summary
Switching to Firestore is the **cleanest path**. It removes the "file locking" issues of JSON and prepares your app for scale without forcing you to learn complex SQL relations for simple trip data.
