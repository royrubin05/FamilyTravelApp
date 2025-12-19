# FamilyTravelApp

A data-centric family travel dashboard built with Next.js, featuring real AI trip parsing (Google Gemini), a list-based UI, and mobile optimization.

## Features
- **Dashboard**: "Upcoming" and "Completed" tabs for organizing trips.
- **AI Import**: Upload PDF itineraries to automatically extract details (Destination, Dates, Travelers).
- **Responsive**: Fully optimized for mobile and desktop.
- **Visuals**: Auto-fallback for missing images; sleek dark mode UI.

## Getting Started

To run this project on another computer:

### 1. Prerequisite
Ensure you have **Node.js** (v18+) and **git** installed.

### 2. Clone the Repository
```bash
git clone https://github.com/royrubin05/FamilyTravelApp.git
cd FamilyTravelApp
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your **Google Gemini API Key**:
   ```
   GEMINI_API_KEY=your_key_here
   ```
   (Get a free key at [Google AI Studio](https://aistudio.google.com))

### 5. Run the App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the app.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion
- **AI**: Google Gemini 1.5 Flash (`@google/generative-ai`)
### 6. Using with Antigravity (Agent)
1.  **Clone** the repository on your new machine.
2.  **Open Antigravity** and select **"Add Folder"**.
3.  Choose the `FamilyTravelApp` directory.
4.  The agent will automatically index the codebase and be ready to assist (the `task.md` and context will start fresh, but the code structure is self-documenting).
