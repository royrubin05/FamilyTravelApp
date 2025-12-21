# n8n Integration Master Plan

This document outlines the strategy for integrating **n8n** (a workflow automation tool) into the Family Travel App ecosystem.

## 1. The Vision: "Logic-as-a-Service"

Currently, your "business logic" (parsing PDFs, deciding whether to merge trips, validating travelers) lives inside Next.js code (`src/app/actions.ts`).

**The Goal**: Move this complex, AI-heavy logic out of the code and into **n8n Workflows**.

### Why?
*   **Visual Logic**: You can see the flow of data (Input -> AI -> Filter -> Database).
*   **Rapid Iteration**: Tweak prompts or logic in n8n without re-deploying the entire Next.js app.
*   **Agentic Power**: n8n is built for AI agents. It can easily chain multiple AI calls (e.g., "Check weather", "Search Google for hotel images", "Draft email").
*   **Clean Code**: Your Next.js app becomes a "dumb" frontend. It just uploads a file and waits for n8n to say "Done".

---

## 2. Architecture Overview

We will shift from a **Monolithic** approach to an **Event-Driven** one.

| Component | Role | Responsibility |
| :--- | :--- | :--- |
| **Next.js (App)** | **Frontend & Trigger** | uploads files to GCS, then sends a "New File" signal to n8n. Displays results. |
| **Google Cloud (GCP)** | **Infrastructure** | HOSTS the App (Cloud Run), STORES data (Firestore), STORES files (GCS). |
| **n8n** | **The Brain (Logic)** | Receives signal -> Downloads file -> Calls Gemini -> Validates Data -> Updates Firestore. |
| **GitHub** | **Version Control** | Stores the Next.js code AND the n8n workflow JSON files (for backup/versioning). |
| **Antigravity (AI)** | **The Architect** | Writes the Next.js API calls, generates n8n JavaScript code, and debugs errors. |

### The New "Trip Upload" Flow

1.  **User** drops PDF in App.
2.  **App** uploads PDF to Google Cloud Storage (GCS).
3.  **App** sends a `POST` webhook to n8n: `{ "fileUrl": "gs://...", "uploadedBy": "Roy" }`.
4.  **n8n Workflow**:
    *   **Node 1**: Read file from GCS.
    *   **Node 2**: Send to Gemini 2.0 (Prompt: "Extract trip details...").
    *   **Node 3**: Fetch existing trips from Firestore (to check overlap).
    *   **Node 4 (Code)**: "Smart Merge" logic (JavaScript).
    *   **Node 5**: Write final trip to Firestore.
5.  **n8n** responds to App: `{ "success": true, "tripId": "miami-2026" }`.
6.  **App** refreshes the UI.

---

## 3. How to Set It Up

You have two main paths for n8n.
## 3. Setup Options & Recommendation

### **Recommendation: Use n8n Cloud (SaaS)**
> [!NOTE]
> We initially attempted self-hosting but switched to Cloud for stability and ease of maintenance.

- **Pros**:
    - Zero infrastructure management.
    - Guaranteed uptime and stability (no "Database not ready" errors).
    - Faster setup time.
- **Cons**:
    - Monthly cost (starts at ~$20/mo).
    - Data leaves your GCP VPC (but n8n is SOC2 compliant).

### ~~Option B: Self-Hosted on Google Cloud Run~~ [DEPRECATED]
*Archived Strategy: While technically cheaper (~$5-10/mo), the complexity of managing database migrations, cold starts, and persistent storage proved to be a distraction from building the app itself.*

### 💰 Cost Comparison: Cloud vs. Self-Hosted

| Feature | **n8n Cloud (Starter)** | **Self-Hosted (GCP)** |
| :--- | :--- | :--- |
| **Monthly Cost** | **~$22 / month** (€20) | **~$12 - $15 / month** |
| **Breakdown** | Fixed subscription | ~$11 (Cloud SQL Micro) + ~$1-2 (Cloud Run*) |
| **Executions** | 2,500 / month | Unlimited (pay for compute) |
| **Data Privacy** | Data leaves your GCP | **Data stays in your GCP** |
| **Setup Effort** | Zero (Instant) | Low (Run 1 script) |
| **Maintenance** | Managed by n8n | You click "Deploys" to update |

*\*Cloud Run is often **Free** for low usage (tier coverage), so you mostly pay for the Database.*

**Recommendation**: **Self-Hosted on GCP**.
*   **Cheaper**: Saves ~40% monthly.
*   **Better Privacy**: Customer data (trips) never leaves your project.
*   **Scalable**: No execution limits; you just pay for tiny CPU usage.

---

## 4. How We Work Together (The Protocol)

Here is the workflow for building features with Me (Antigravity), You, and these tools.

### Phase 1: The Request
**You**: "Refactor the Trip Parser to use n8n."

### Phase 2: The Build (Antigravity & You)
1.  **I write the Frontend Code**: I update `actions.ts` to *stop* calling Gemini directly and *start* calling your `N8N_WEBHOOK_URL`.
2.  **I design the Workflow**: I describe exactly what the n8n workflow should do:
    *   "Create a Webhook node (POST)."
    *   "Add a Firestore node (Get All Trips)."
    *   "Add a Code node (Paste this JavaScript I wrote for you)."
3.  **You build in n8n**: You open the n8n UI, drag the nodes I suggested, and paste the code/prompts I verify.
4.  **Testing**: We trigger it from the local app. I watch the logs; you watch the n8n execution view (the "glowy lines").

### Phase 3: Version Control (GitHub)
*   n8n workflows are JSON.
*   **Rule**: After a workflow is working, you Copy All -> Save as `workflows/trip-parser.json` in this repo.
*   **I commit it**: `git commit -m "feat: New n8n trip parser workflow"`.
*   Now your logic is backed up safely in GitHub alongside your code.

---

## 5. Next Steps (Action Plan)

If you approve this direction, here is my recommended path:

1.  **Install n8n**:
    *   **Option A (Fast)**: Run n8n locally via Docker (`docker run -p 5678:5678 n8n/io`) just to test. We use `ngrok` to let the internet see it.
    *   **Option B (Robust)**: I write a `deploy_n8n.sh` script to launch n8n on your Google Cloud project right now.

2.  **Create "Upload Trip" Workflow**:
    *   I will give you the precise prompt and JavaScript logic to paste into n8n.
    *   We verify it processes a PDF correctly.

3.  **Refactor App**:
    *   I modify `src/app/actions.ts` to call the webhook instead of running the logic itself.

**Ready to proceed? Tell me if you want Option A (Local Test) or Option B (Cloud Deployment) for n8n.**
