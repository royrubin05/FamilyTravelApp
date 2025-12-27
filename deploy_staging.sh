#!/bin/bash
set -e

# Configuration
echo "🔍 Checking configuration for STAGING..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo "❌ No project selected in gcloud config."
    exit 1
fi

BUCKET_NAME="${PROJECT_ID}-travel-data"
REGION="us-central1"
REPO_NAME="travel-app-repo"
IMAGE_NAME="family-app-staging"
SERVICE_NAME="family-travel-app-staging"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "✅ Using Project: $PROJECT_ID"
echo "✅ Target Service: $SERVICE_NAME (STAGING)"

# Step 1: Enable APIs (Skipping, assumed enabled)
# Step 2: Build & Push Docker Image
echo ""
echo "🐳 Building and Pushing Docker Image (via Cloud Build) for Staging..."
gcloud builds submit --tag ${IMAGE_PATH} . --gcs-source-staging-dir=gs://${BUCKET_NAME}/source
echo "✅ Image built & pushed via Cloud Build"

# Step 3: Deploy to Cloud Run
echo ""
echo "☁️ Deploying to Cloud Run (Staging)..."

# Try to auto-detect API key
if [ -f .env.local ]; then
    echo "🔑 Found .env.local, attempting to read GEMINI_API_KEY..."
    GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Enter your Gemini API Key (hidden):"
    read -s GEMINI_API_KEY
fi

# DEPLOYMENT COMMAND
# Deploys to the STAGING service
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_PATH} \
  --region=${REGION} \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY="${GEMINI_API_KEY}" \
  --execution-environment=gen2

echo ""
echo "🎉 STAGING DEPLOYMENT COMPLETE!"
echo "Check the URL above on your mobile device."
