# AI Trip Titling Workflow

## Objective
Automatically generate human-readable, context-aware titles for trips based on flight data.

## Contexts
1.  **Dashboard / Group List / Edit List**: Detailed route description.
    *   Direct: `Origin <-> Destination`
    *   1 Stop: `Origin to Destination (connecting in Stop1)`
    *   2 Stops: `Origin to Destination (connecting in Stop1 and Stop2)`
    *   3+ Stops: `Origin to Destination (multiple stops)`
2.  **Trip Page Header**: Primary destination name.
    *   Example: `Tel Aviv`

## Implementation Steps

### 1. Update Gemini Prompt & Schema
Modify `src/lib/GeminiDebug.ts` to include `dashboard_title` and `page_title` in the output JSON.

**Prompt Additions:**
```text
title_rules:
- dashboard_title:
  - If direct (A->B): "A <-> B"
  - If 1 stop (A->S1->B): "A to B (connecting in S1)"
  - If 2 stops (A->S1->S2->B): "A to B (connecting in S1 and S2)"
  - If >2 stops: "A to B (multiple stops)"
  - A = Origin (City or Airport Code). B = Final Destination.
- page_title:
  - The main city name of the destination (e.g. "Tel Aviv", "London").
```

### 2. Update Database Schema
- Add `dashboardTitle` (string) and `pageTitle` (string) to the `Trip` object in Firestore.

### 3. Backfill Script
- Create `scripts/backfill_titles.ts`.
- Iterate all trips.
- If titles are missing, send `trip.flights` to Gemini to generate them.
- Save back to Firestore.

### 4. Frontend Updates
- Update `DashboardClient.tsx`, `GroupContent.tsx`, `EditGroupModal.tsx` to display `trip.dashboardTitle`.
- Update `TripContent.tsx` to display `trip.pageTitle`.
