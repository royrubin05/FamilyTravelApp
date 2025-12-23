# Multi-User Architecture Design Document (Draft)

## 1. Executive Summary
This document outlines the architectural changes required to transition **TravelRoots** from a single-tenant (single family) application to a multi-tenant (multi-user/SaaS) platform. The primary goal is to isolate user data while maintaining the current feature set (AI trip parsing, dashboards, shared grouping).

## 2. Infrastructure Assessment

### 2.1 Current Stack Analysis
*   **Database**: Google Firestore (NoSQL).
    *   *Assessment*: **Excellent Fit**. Firestore is natively designed for multi-tenant interactions via Security Rules and subcollections. No need to migrate to SQL unless complex relational queries (e.g., cross-tenant analytics) become a priority. 
*   **Storage**: Google Cloud Storage.
    *   *Assessment*: **Good Fit**. Can easily structure buckets with user-specific paths (e.g., `users/{userId}/documents/`) secured by storage rules.
*   **Compute**: Next.js on Cloud Run.
    *   *Assessment*: **Excellent Fit**. Stateless containerization allows easy scaling as user load increases.
*   **Authentication**: Custom Cookie / Hardcoded.
    *   *Assessment*: **Must Replace**. The current hardcoded logic is insufficient for multi-user security.

### 2.2 Recommendation
We should **retain the current infrastructure** (Firestore + Cloud Storage + Cloud Run) but fundamentally restructure the **Data Model** and **Authentication** layers.

---

## 3. Proposed Architecture

### 3.1 Authentication & Identity management
Migrate to **Firebase Authentication** (Identity Platform).
*   **Methods**: **Username / Password** (Shared Family Login).
*   **Implementation**: 
    *   **Technical Rationale**: Firebase Authentication **requires** an Email format for accounts. It does not natively support plain Usernames.
    *   **The Fix**: To get the best of both worlds (Secure Firebase Auth + Simple Usernames), the system will automatically append a dummy domain (e.g. `username` -> `username@travelroots.internal`) when communicating with Firebase. This is 100% invisible to the user.
    *   **Password Recovery**: 
        *   Since the "Auth Email" is fake, we cannot use it for recovery. 
        *   We will store a **Real** `recoveryEmail` in the User's database document.
        *   **Flow**: User clicks "Forgot Password" -> Enters **Username** -> System looks up `recoveryEmail` -> System sends standard Firebase Password Reset link to that address.
    *   **Visuals**: The Login screen will explicitly ask for "Username" and "Password".

### 3.2 Data Model Restructuring (Single Account per Family)
We are collapsing the "User" and "Household" concepts. **One Login = One Family**.

#### A. Users Collection (The Household)
`users/{userId}`
*   `username`: string (Unique, e.g., "rubin_family")
*   `displayName`: string (e.g., "The Rubins")
*   `recoveryEmail`: string (Private, for password resets only)
*   `createdAt`: timestamp
*   `role`: "admin" | "user"
*   *(No Subscription Status - All are Free)*

#### B. Sub-Collections (Data Isolation)
All data lives directly under the User document to ensure isolation.

**1. Settings**
`users/{userId}/settings/config`
*   Contains `familyMembers` (Name + Nicknames array), `backgroundImage`, `cityImages`.

**2. Trips**
`users/{userId}/trips/{tripId}`
*   **Security Rule**: `match /users/{userId}/trips/{tripId} { allow read, write: if request.auth.uid == userId; }`

**3. Trip Groups**
`users/{userId}/groups/{groupId}`

### 3.3 Storage Isolation
**Structure:** `gs://bucket-name/{householdId}/...`
*   `.../documents/` (PDFs)
*   `.../images/` (Backgrounds)
*   **Security:** Update Storage Rules to ensuring only household members can read/write to their prefix.

---

### 4. Admin Portal UI/UX (Super Admin Only)
**Design Rule: Modals Only.** All confirmations, forms, and alerts must be presented via application Modals (never browser `window.confirm` or page redirects).

Since public sign-up is disabled, user creation is strictly a manual process performed by the **Super Admin** via a specialized Backoffice Portal.

### 4.1 Admin Dashboard / Family Management (`/admin/families`)
*   **Primary View**: A clean list of all **Families** on the platform.
*   **Sidebar Navigation**: **Families**, System Logs.
*   **Table Columns**:
    *   **Username**: Unique Login ID (e.g., `rubin_family`).
    *   **Family Name**: Display Name (e.g., `The Rubins`).
    *   **Status**: Active / Inactive.
    *   **Actions**: 
        *   **Reset Password**: Triggers a system reset.
        *   **Impersonate**: View as this family.
        *   **Deactivate/Activate**: Manage access.

*   **Global Actions**:
    *   **Create Family**: Manually provision a new account.

*(KPI cards removed. Complex Household Management removed since 1 User = 1 Family)*

![Admin Dashboard Mockup](/Users/royrubin/.gemini/antigravity/brain/89e7c01c-fb29-40ef-9e51-a1727985bfb9/admin_dashboard_family_only_1766512933403.png)
*   **Create Family Action**:
    *   **Modal**: "Create New Family"
    *   **Fields**: Username, Password, Display Name.
    *   **Flow**:
        1.  Admin enters details.
        2.  System creates Auth User (with dummy email).
        3.  System creates User Document (`users/{uid}`).

### 4.2 Admin Dashboard / System Logs (`/admin/logs`)
*   **Purpose**: A global debugging view to monitor AI performance across ALL families.
*   **Table Columns**:
    *   **Timestamp**: Date/Time of upload.
    *   **Family**: Which family uploaded it.
    *   **Filename**: Name of the PDF/Email.
    *   **Status**: Success / Failed.
    *   **Actions**: 
        *   **"View Prompt"**: Shows the exact text sent to Gemini.
        *   **"View Response"**: Shows the raw JSON response.
        *   **"View Error"**: Stack trace if failed.
*   **Filters**: Sort by Family, Status, Date.

### 4.3 Simulation & Debugging
*   **"Impersonate User" Mode**:
    *   A prominent banner appears: *"Viewing as [Action Family] - Read Only Mode"*.
    *   **Exit Action**: "Return to Admin" button constantly visible in the header/banner.
    *   The Admin sees the exact dashboard the user sees.
    *   Useful for verifying bug reports like "My trip isn't showing up".

### 4.5 User-Facing Authentication (`/login`)
*   **Simple Login Form**: Email & Password only.
*   **No "Sign Up" Link**: Replaced with "Invitation Only Platform".
*   **Forgot Password**: Standard flow.
*   **User Settings Panel**:
    *   **Visible & Editable**:
        *   **Change Password**: Standard security update.
        *   **Family Members**: Can add/edit/remove names and nicknames (since this drives their AI matching).
        *   **Appearance**: Can upload Background Images.
    *   **Read-Only / Hidden**:
        *   **Username**: Read-only.
        *   **Recovery Email**: Read-only (Must contact Admin to change).
        *   **Data Audit**: **Hidden** from users (Admin tool only).
        *   **Billing/Subscription**: **Hidden** (Not applicable).
        *   **System Config**: **Hidden** (API Keys, etc. are Admin only).

---

## 5. Migration Strategy
Since we have live data, we cannot just "flip the switch".

1.  **Step 1: Code Prep**. Refactor `getTrips`, `saveTrip`, `getSettings` to accept a `context` (householdId/userId).
2.  **Step 2: Auth Implementation**. 
    *   Implement Firebase Auth on a parallel route (e.g., `/login-v2`).
    *   **Cleanup**: completely **delete** the legacy `loginAction` hardcoded credential check (`roy.rubin@gmail.com`) from `actions.ts`. The new app will rely 100% on Firebase `verifyIdToken`.
3.  **Step 3: Data Migration Script**.
    *   **Target User**: The specific `royrubin` account (provisioned via Bootstrap script).
    *   **Move Data**: 
        *   All docs from root `trips` collection -> `users/{royrubin_uid}/trips`.
        *   All docs from root `trip_groups` collection -> `users/{royrubin_uid}/groups`.
        *   `settings/global` document -> `users/{royrubin_uid}/settings/config`.
    *   **Result**: The Super Admin account immediately "owns" the entire legacy app state.
4.  **Step 4: Cutover**. Update the main application to require Auth context and read from the new paths.

## 6. Effort Estimate
*   **Infrastructure (Auth Setup)**: Low (1-2 days)
*   **Refactoring Data Access Layer**: Medium (3-5 days) - Need to touch every `actions.ts`.
*   **UI Updates (Login/Profile)**: Low (2-3 days).
## 7. Development & Deployment Master Plan

### 7.1 Phase 1: Parallel Development (The "Lab")
To ensure **zero disruption** to the current live app, we will build the multi-user version in complete isolation.

*   **Codebase**: Create a new git branch `feature/multi-user-core`.
*   **Database**: Provision a new **Firestore Database** instance (ID: `travel-v2-test`) within the existing Google Cloud Project. This guarantees the live `(default)` database is strictly untouched.
*   **Auth**: Enable Identity Platform (Firebase Auth) linked to the V2 app.
*   **Hosting**: Deploy to a **new Cloud Run Service** named `family-travel-v2-preview`.
    *   **URL**: `https://travel-v2.platform63.com` (Created via Custom Domain mapping).
    *   *Fallback*: `https://family-travel-v2-preview-[hash].a.run.app` (Default Cloud Run URL).
    *   **Env Vars**: Configured to point to the `travel-v2-test` DB.
    *   **DNS Setup (GoDaddy)**:
        1.  In Cloud Run "Manage Custom Domains", add `travel-v2.platform63.com`.
        2.  Google will provide a `ghs.googlehosted.com` CNAME target.
        3.  Log into **GoDaddy** -> DNS Management for `platform63.com`.
        4.  Add Record:
            *   **Type**: `CNAME`
            *   **Name**: `travel-v2`
            *   **Value**: `ghs.googlehosted.com`
            *   **TTL**: `1 Hour`

### 7.2 Phase 2: Testing & QA
*   **Admin Testing**: You log into the V2 URL, create test families, and upload trips to verify the new isolation logic.
*   **Data Parity Check**: We will run a "Dry Run" migration script to copy your current family's live data from the `(default)` DB to the `v2` DB types (transforming it to the new schema) to ensure it renders perfectly.

### 7.3 Super Admin Security & Recovery
*   **The "Master" Identity**: We will not hardcode "royrubin" in the codebase (security risk). Instead, we assign the `admin` Custom Claim in Firebase Auth to your specific account.
*   **Bootstrapping (First Run)**: Since there is no public signup, we will write a one-time **CLI Script** (`scripts/create-super-admin.ts`) that you run locally to provision your `royrubin` account and grant it Admin privileges.
*   **Anti-Lockout Fail-safe**: 
    *   As the GCP Project Owner, you always have "God Mode".
    *   If you lose your password or the UI breaks, you can simply log into the **Firebase Console**, find your user row, and click "Reset Password" or manually update the User Document. You can never be locked out as long as you own the Google Cloud account.
*   **Password Changes**: You can change your password via the standard "Profile Settings" in the app, just like any other family.

### 7.4 Phase 3: The "Go Live" Merge
Once V2 is verified and stable, we execute the cutover.

1.  **Maintenance Window**: Deploy a "Maintenance Mode" banner to the current Prod App.
2.  **Final Migration**: Run the migration script to copy ALL live data from `(default)` DB to `travel-v2-test` DB, accurately transforming it into the new `users/{familyId}/trips` structure.
3.  **Code Promotion**: Merge `feature/multi-user-core` into `main`.
4.  **Traffic Swap**:
    *   Update the Production Cloud Run Service (`family-travel-app`) to use the **new code** and point to the **new database** (`travel-v2-test`).
    *   *Safety Net*: The old `(default)` database remains untouched as a simplified backup.
5.  **DNS**: `travel.platform63.com` now serves the Multi-User app. 

This approach reduces risk to near zero, as we never mutate the original database until we are 100% migrated.
