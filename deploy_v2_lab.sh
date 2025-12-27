#!/bin/bash
set -e

# Configuration for V2 Lab
echo "🧪 Setting up V2 LAB Context..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
BUCKET_NAME="${PROJECT_ID}-v2-lab-data"
REGION="us-central1"
REPO_NAME="travel-app-repo"
IMAGE_NAME="family-app-v2-lab"
SERVICE_NAME="family-travel-v2-preview"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "✅ Using Project: $PROJECT_ID"
echo "✅ Target Service: $SERVICE_NAME"
echo "✅ Target Bucket: gs://${BUCKET_NAME}"

# Step 1: Enable APIs
echo ""
echo "🚀 [1/4] Enabling Google Cloud APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com storage-component.googleapis.com cloudbuild.googleapis.com
echo "✅ APIs Enabled"

# Step 2: Ensure Lab Bucket Exists
echo ""
echo "🪣 [2/4] Checking Lab Storage Bucket..."
if ! gcloud storage buckets describe gs://${BUCKET_NAME} &>/dev/null; then
    echo "Creating new bucket: gs://${BUCKET_NAME}..."
    gcloud storage buckets create gs://${BUCKET_NAME} --location=${REGION}
fi
echo "✅ Bucket ready."

# Step 3: Build & Push Docker Image
echo ""
echo "🐳 [3/4] Building and Pushing Docker Image (via Cloud Build)..."
if ! gcloud artifacts repositories describe ${REPO_NAME} --location=${REGION} &>/dev/null; then
    gcloud artifacts repositories create ${REPO_NAME} --repository-format=docker --location=${REGION}
fi

# Sync Data Files (trips.json, etc) to LAB bucket
echo "🔄 Syncing Data & Assets to LAB Bucket..."
gcloud storage cp src/data/*.json gs://${BUCKET_NAME}/data/
gcloud storage cp -r public/images gs://${BUCKET_NAME}/public/
gcloud storage cp -r public/documents gs://${BUCKET_NAME}/public/
gcloud storage cp -r public/icons gs://${BUCKET_NAME}/public/

echo "📦 Uploading source to staging bucket..."
gcloud builds submit --tag ${IMAGE_PATH} . --gcs-source-staging-dir=gs://${BUCKET_NAME}/source
echo "✅ Image built & pushed via Cloud Build"

# Step 4: Deploy to Cloud Run
echo ""
echo "☁️ [4/4] Deploying to Cloud Run (V2 LAB)..."

# Try to auto-detect API key
if [ -f .env.local ]; then
    echo "🔑 Found .env.local, attempting to read GEMINI_API_KEY..."
    GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Enter your Gemini API Key (hidden):"
    read -s GEMINI_API_KEY
fi

# Deploy with NO_TRAFFIC initially (optional, but for lab it's fine to be live)
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_PATH} \
  --region=${REGION} \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY="${GEMINI_API_KEY}",NEXT_PUBLIC_APP_MODE="v2-lab" \
  --execution-environment=gen2

echo ""
echo "🧪 V2 LAB DEPLOYMENT COMPLETE!"
echo "You can access your V2 Lab app at the URL above."
