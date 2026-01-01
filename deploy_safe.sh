#!/bin/bash
set -e

# Configuration
echo "🔍 Checking configuration..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo "❌ No project selected in gcloud config."
    exit 1
fi

BUCKET_NAME="${PROJECT_ID}-travel-data"
REGION="us-central1"
REPO_NAME="travel-app-repo"
IMAGE_NAME="family-app"
SERVICE_NAME="family-travel-app"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "✅ Using Project: $PROJECT_ID"
echo "✅ Target Bucket: gs://${BUCKET_NAME}"

# Step 1: Enable APIs (Skipping, assumed enabled)
# Step 2: Build & Push Docker Image
echo ""
echo "🐳 Building and Pushing Docker Image (via Cloud Build)..."
gcloud builds submit --tag ${IMAGE_PATH} . --gcs-source-staging-dir=gs://${BUCKET_NAME}/source
echo "✅ Image built & pushed via Cloud Build"

# Step 3: Deploy to Cloud Run
echo ""
echo "☁️ Deploying to Cloud Run..."

# Try to auto-detect API key
if [ -f .env.local ]; then
    echo "🔑 Found .env.local, attempting to read GEMINI_API_KEY..."
    GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Enter your Gemini API Key (hidden):"
    read -s GEMINI_API_KEY
fi

# Extract Email credentials
if [ -f .env.local ]; then
    echo "📧 Reading Email Config from .env.local..."
    EMAIL_USER=$(grep EMAIL_USER .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
    EMAIL_PASSWORD=$(grep EMAIL_PASSWORD .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
    EMAIL_HOST=$(grep EMAIL_HOST .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
fi

# DEPLOYMENT COMMAND
# Matches the original but skips the 'Sync Data' steps
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_PATH} \
  --region=${REGION} \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY="${GEMINI_API_KEY}",EMAIL_USER="${EMAIL_USER}",EMAIL_PASSWORD="${EMAIL_PASSWORD}",EMAIL_HOST="${EMAIL_HOST}" \
  --execution-environment=gen2

echo ""
echo "🎉 SAFE DEPLOYMENT COMPLETE (Code Only, Data Preserved)!"
