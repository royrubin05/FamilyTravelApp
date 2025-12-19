# Deploying to Google Cloud Run (with Persistence)

This guide explains how to deploy the Family Travel App to **Google Cloud Run**.
Unlike Vercel, Cloud Run allows us to attach **persistent storage**, so uploaded trips and images are saved permanently.

## Prerequisites

1.  **Google Cloud Platform (GCP) Project**: Create one at [console.cloud.google.com](https://console.cloud.google.com).
2.  **gcloud CLI**: Install and authenticate on your machine (`gcloud auth login`).
3.  **Docker**: Installed and running locally.

## 🔄 Workflow & Architecture

Here is how the pieces fit together:

### 1. The Code Workflow (Deploying Changes)
*   **Local**: You write code and test locally (`npm run dev`).
*   **GitHub**: You push code to GitHub for backup and collaboration (`git push`).
*   **GCP Deployment**: When you run `./deploy_gcp.sh`:
    1.  It takes your **current local code**.
    2.  Sends it to **Google Cloud Build**.
    3.  Builds a Docker container.
    4.  Updates the **Cloud Run** service.

**Note**: The deployment script builds from your *local machine*, not directly from GitHub. This is faster for individual developers.

### 2. The Data Workflow (Persistence)
This is the most important part. Your app needs to save files (images, trips) that survive restarts.
*   **Locally**: Files are saved to your Mac's hard drive (`src/data`, `public/images`).
*   **In Cloud Run**:
    *   The app *thinks* it is saving to the local filesystem.
    *   **BUT**, we mounted a **Google Cloud Storage Bucket** (`gs://travelapp05-travel-data`) to those specific folders.
    *   So, when you upload a photo in the live app, it actually goes straight to the Storage Bucket.
    *   **Result**: If you redeploy the app, the data is safe in the bucket and reappears immediately.

### ⚠️ Important: Data Sync
*   **Cloud Data stays in Cloud**: Uploads made on the live website do NOT automatically appear on your local Mac.
*   **Local Data stays Local**: New test data on your Mac does NOT automatically go to the cloud (unless you re-run the deployment script, which copies initial data).



## Step 1: Prepare the Infrastructure

We need a persistent place to store `trips.json` and images. We'll use **Google Cloud Storage (GCS)** mounted as a file system.

1.  **Enable APIs**:
    ```bash
    gcloud services enable run.googleapis.com artifactregistry.googleapis.com storage-component.googleapis.com
    ```

2.  **Create a Storage Bucket**:
    ```bash
    export PROJECT_ID=$(gcloud config get-value project)
    export BUCKET_NAME="${PROJECT_ID}-travel-data"
    gcloud storage buckets create gs://${BUCKET_NAME} --location=us-central1
    ```

3.  **Upload Initial Data**:
    Copy your local data to the bucket so the app starts with your current trips.
    ```bash
    # Copy trips.json and associated files
    gcloud storage apply src/data/*.json gs://${BUCKET_NAME}/data/

    # Copy existing images/docs
    gcloud storage cp -r public/images gs://${BUCKET_NAME}/public/images
    gcloud storage cp -r public/documents gs://${BUCKET_NAME}/public/documents
    ```

## Step 2: Build and Push Docker Image

1.  **Create Artifact Registry**:
    ```bash
    gcloud artifacts repositories create travel-app-repo --repository-format=docker --location=us-central1
    ```

2.  **Build & Push**:
    ```bash
    # Configure Docker to use gcloud credentials
    gcloud auth configure-docker us-central1-docker.pkg.dev

    # Build and Push
    docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/${PROJECT_ID}/travel-app-repo/family-app:latest .
    docker push us-central1-docker.pkg.dev/${PROJECT_ID}/travel-app-repo/family-app:latest
    ```

## Step 3: Deploy to Cloud Run

We will deploy the container and mount the GCS bucket to `/app/mnt`.
*Note: The app expects data in `/app/src/data` and `/app/public`. We need to use symlinks or update the app config. For simplicity, we'll mount effectively.*

**Wait!** The simplest approach for this app (without code changes) is to mount the bucket volumes to the exact paths.
*   Mount bucket `data` folder -> `/app/src/data`
*   Mount bucket `public` folder -> `/app/public`

```bash
gcloud run deploy family-travel-app \
  --image=us-central1-docker.pkg.dev/${PROJECT_ID}/travel-app-repo/family-app:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY="YOUR_API_KEY_HERE" \
  --add-volume=name=travel-data,type=cloud-storage,bucket=${BUCKET_NAME} \
  --add-volume-mount=volume=travel-data,mount-path=/app/src/data,sub-path=data \
  --add-volume-mount=volume=travel-data,mount-path=/app/public/images,sub-path=public/images \
  --add-volume-mount=volume=travel-data,mount-path=/app/public/documents,sub-path=public/documents \
  --execution-environment=gen2
```

## Step 4: Access Your App

Cloud Run will output a URL (e.g., `https://family-travel-app-xyz.a.run.app`).
Open it, and try uploading a trip! The data will persist in your GCS bucket.

---

## Step 5: (Optional) Custom Domain Setup

Want your app at `travel.rubin.com` instead of the long generated URL?

1.  **Map the Domain**:
    Run this command (replace `your-domain.com` with your actual domain):
    ```bash
    gcloud beta run domain-mappings create --service family-travel-app --domain your-domain.com --region us-central1
    ```

2.  **Update DNS Records**:
    - The command output will give you a list of DNS records (likely `A` or `AAAA` records).
    - Go to your Domain Registrar (GoDaddy, Namecheap, Google Domains, etc.).
    - Add these records to your domain's DNS settings.

3.  **Wait for SSL**:
    - Google automatically provisions a managed SSL certificate (HTTPS) for you.
    - This can take **15-60 minutes** to propagate.
