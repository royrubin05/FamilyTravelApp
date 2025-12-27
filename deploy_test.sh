#!/bin/bash
set -e

# Configuration
echo "🔍 Configuration for Test Deployment..."
PROJECT_ID="travelapp05"
BUCKET_NAME="${PROJECT_ID}-travel-data"
REGION="us-central1"
REPO_NAME="travel-app-repo"
IMAGE_NAME="family-app"
SERVICE_NAME="family-travel-v2-preview"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "✅ Using Project: $PROJECT_ID"
echo "✅ Target Bucket: gs://${BUCKET_NAME}"
echo "✅ Service Name: ${SERVICE_NAME}"

# Step 1: Bump Version
echo ""
echo "🆙 Bumping App Version..."
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ Version bumped to v${NEW_VERSION}"

# Step 3.5: Sync Data & Assets to GCS Bucket (Persistence Layer)
echo ""
echo "🔄 Syncing Data & Assets to Persistence Bucket..."

# Sync Data Files (trips.json, cityImages.json)
gcloud storage cp src/data/*.json gs://${BUCKET_NAME}/data/

# Sync Public Assets (Images & Docs)
gcloud storage cp -r public/images gs://${BUCKET_NAME}/public/
gcloud storage cp -r public/documents gs://${BUCKET_NAME}/public/
gcloud storage cp -r public/icons gs://${BUCKET_NAME}/public/

echo "✅ Data synced to bucket"

# Step 3: Build & Push
echo ""
echo "🐳 Building and Pushing Docker Image..."
gcloud builds submit --tag ${IMAGE_PATH} . --gcs-source-staging-dir=gs://${BUCKET_NAME}/source

# Step 4: Deploy to Cloud Run
echo ""
echo "☁️ Deploying to Cloud Run (${SERVICE_NAME})..."

# Try to auto-detect API key
if [ -f .env.local ]; then
    echo "🔑 Found .env.local, attempting to read GEMINI_API_KEY..."
    GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Enter your Gemini API Key (hidden):"
    read -s GEMINI_API_KEY
fi

# Update service.yaml with new version to force revision
# Note: uses sed compatible with macOS
sed -i '' "s/value: v2-lab.*/value: v2-lab-${NEW_VERSION}/" service.yaml

# Deploy using YAML configuration (supports subPath volume mounts)
gcloud run services replace service.yaml --region=${REGION}

echo ""
echo "🎉 TEST DEPLOYMENT COMPLETE!"
echo "URL: https://travel-v2.platform63.com"
