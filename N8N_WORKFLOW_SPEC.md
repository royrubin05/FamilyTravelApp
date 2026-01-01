# n8n Workflow Specification: Trip Upload

This document provides the specific code and prompts to use inside your n8n workflow nodes.

## Node 1: Webhook (Trigger)
*   **Trigger Type**: 
    1.  **POST Webhook** (`/webhook/trip-upload`): for existing PDF upload flow.
    2.  **Email Trigger** (IMAP / Gmail / SendGrid): for forwarded emails.
*   **Output**: 
    *   `senderEmail` (string)
    *   `content` (text/html)
    *   `attachments` (files)

---

## Node 2: Firestore (User Lookup)
*   **Goal**: Find the user who owns this email.
*   **Operation**: Get All
*   **Collection**: `users`
*   **Options**: 
    *   **Filter**: (Client Side Filtering in next Code Node required because `forwardingEmails` is a complex object in `settings/config` subcollection, OR use Collection Group Query if indexed).
    *   *Simpler Approach for V1*:
        *   Receive Email.
        *   Function: `findUserByForwardingEmail(senderEmail)`.
        *   This requires a Collection Group Index on `settings` collection if we query directly, OR we can store a global `email_mapping` collection.
        *   *Selected Strategy*: **Collection Group Query** on `settings` where `forwardingEmails` array-contains `senderEmail`.

---

## Node 3: Gemini Chat (Extract Data)
*   **Model**: Gemini Pro 1.5 (or Flash)
*   **Prompt**:
    ```text
    You are an expert Travel Assistant.
    Extract the following details from the attached document/email content:
    1. Destination (City, Country)
    2. Start Date (YYYY-MM-DD)
    3. End Date (YYYY-MM-DD)
    4. Travelers (Name, Role) - STRICTLY only people named in the doc.
    5. Type (Flight, Hotel, Activity)
    
    Return as JSON:
    {
      "destination": "Paris, France",
      "startDate": "2025-05-01",
      "endDate": "2025-05-10",
      "travelers": ["Roy"],
      "type": "Hotel"
    }
    ```

---

## Node 4: Firestore (Get Context)
*   **Operation**: Get All
*   **Collection**: `users/{userId}/trips`
*   **Limit**: 50 (or filter by dates if possible)

---

## Node 5: Code (Smart Merge Logic)
**Language**: JavaScript
**Code**:
```javascript
// Inputs:
const newTrip = $('Gemini Chat').first().json;
const existingTrips = $('Firestore Context').all().map(i => i.json);

let finalTrip = null;
let action = "create";

// 1. Logic: Find matching trip
const match = existingTrips.find(t => {
  const destMatch = t.destination.toLowerCase().includes(newTrip.destination.split(',')[0].toLowerCase());
  
  // Date Overlap Check (Simple +/- 3 days)
  const existingStart = new Date(t.startDateISO);
  const newStart = new Date(newTrip.startDate);
  const dayDiff = Math.abs((existingStart - newStart) / (1000 * 60 * 60 * 24));
  
  return destMatch && dayDiff < 7; 
});

if (match) {
  finalTrip = match;
  action = "update";
  
  // Merge Logic
  // ... (Add merge code here, e.g. add new traveler if valid)
  
} else {
  // Create New Trip ID
  const slug = newTrip.destination.toLowerCase().replace(/[^a-z0-9]/g, '-');
  finalTrip = {
    ...newTrip,
    id: `${slug}-${newTrip.startDate}`,
    sourceDocuments: []
  };
}

return {
  json: {
    action,
    trip: finalTrip
  }
};
```

---

## Node 6: Firestore (Save)
*   **Operation**: Set
*   **Collection**: `users/{userId}/trips`
*   **Document ID**: `{{ $json.trip.id }}`
*   **Data**: `{{ $json.trip }}`
