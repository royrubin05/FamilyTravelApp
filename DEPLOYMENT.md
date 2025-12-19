# Vercel Deployment Guide

This application is built with **Next.js**, which makes it natively compatible with Vercel. However, because this app currently uses the **local file system** (`fs`) to store data (`trips.json`) and images, there are important limitations you must understand before deploying.

## ⚠️ Critical Warning: Persistence

Vercel is a **Serverless** platform. This means:
1.  **Read-Only (Mostly)**: The app can *read* files committed to Git (like your current `trips.json` and background images).
2.  **No Permanent Writes**: If you upload a new trip or image via the Dashboard on the live Vercel site:
    -   It might appear to work properly for a few minutes.
    -   **BUT** the moment the serverless function shuts down (usually minutes later), **your data will be lost**.
    -   The next time you visit, it will reset to the state of the GitHub repository.

**Recommendation**:
-   Use Vercel for **viewing/sharing** the app with family.
-   Continue using your **local machine** (localhost) as the "Admin Panel" to upload new trips.
-   After adding trips locally, **commit and push** them to GitHub. Vercel will automatically redeploy with the new data.

---

## How to Deploy

### 1. Create Vercel Account
Go to [vercel.com](https://vercel.com) and sign up (using your GitHub account is easiest).

### 2. Connect Repository
1.  On the Vercel Dashboard, click **"Add New..."** -> **"Project"**.
2.  Select your GitHub repository: `family-travel-app` (or similar).
3.  Click **Import**.

### 3. Configure Environment Variables
You must add your API keys for the app to work.
1.  On the "Configure Project" screen, look for **Environment Variables**.
2.  Add:
    -   **Name**: `GEMINI_API_KEY`
    -   **Value**: (Paste your key starting with `AIza...`)
3.  (If/When implementing Email) Add:
    -   `EMAIL_USER`
    -   `EMAIL_PASSWORD`
    -   `EMAIL_HOST`

### 4. Deploy
1.  Click **Deploy**.
2.  Vercel will build your app (taking ~1-2 minutes).
3.  Once done, you will get a live URL (e.g., `family-travel-app.vercel.app`).

## Future-Proofing (Removing Limitations)
To enable *persistent* uploads directly on the live site, we would need to refactor the app to use:
1.  **Database**: Vercel Postgres or Supabase (instead of `trips.json`).
2.  **File Storage**: Vercel Blob or AWS S3 (instead of `public/images`).

Let me know if you want to explore this path!
