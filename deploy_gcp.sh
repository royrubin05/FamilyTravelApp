#!/bin/bash
set -e

# Configuration
echo "🔍 Checking configuration..."
# Configuration
echo "🔍 Checking configuration..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    echo "⚠️  No project selected in gcloud config."
    echo "Fetching your projects..."
    projects=$(gcloud projects list --format="value(projectId)")
    
    if [ -z "$projects" ]; then
        echo "❌ No projects found. Please create one in the Google Cloud Console first."
        echo "🔗 https://console.cloud.google.com/projectcreate"
        exit 1
    fi

    echo ""
    echo "Please select a project to deploy to:"
    PS3="Enter number (or 'q' to quit): "
    select pid in $projects "Create New Project"; do
        if [ "$pid" == "Create New Project" ]; then
             echo "Enter new project ID (lowercase, hyphens, unique):"
             read new_pid
             echo "Creating project $new_pid..."
             gcloud projects create $new_pid
             PROJECT_ID=$new_pid
             break
        elif [ -n "$pid" ]; then
            PROJECT_ID=$pid
            break
        elif [ "$REPLY" == "q" ]; then
            exit 0
        else
            echo "Invalid selection."
        fi
    done
    
    echo "✅ Setting active project to: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi

BUCKET_NAME="${PROJECT_ID}-travel-data"
REGION="us-central1"
REPO_NAME="travel-app-repo"
IMAGE_NAME="family-app"
SERVICE_NAME="family-travel-app"
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:latest"

echo "✅ Using Project: $PROJECT_ID"
echo "✅ Target Bucket: gs://${BUCKET_NAME}"

# Step 1: Enable APIs
echo ""
echo "🚀 [1/4] Enabling Google Cloud APIs..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com storage-component.googleapis.com cloudbuild.googleapis.com
echo "✅ APIs Enabled"

# ... (Step 2 is unchanged) ...

# Step 3: Build & Push Docker Image
echo ""
echo "🐳 [3/4] Building and Pushing Docker Image (via Cloud Build)..."
if ! gcloud artifacts repositories describe ${REPO_NAME} --location=${REGION} &>/dev/null; then
    gcloud artifacts repositories create ${REPO_NAME} --repository-format=docker --location=${REGION}
    echo "✅ Created Repository: ${REPO_NAME}"
    echo "✅ Created Repository: ${REPO_NAME}"
fi

# Step 3.5: Sync Data & Assets to GCS Bucket (Persistence Layer)
echo ""
echo "🔄 [3.5/4] Syncing Data & Assets to Persistence Bucket..."
echo "Uploaded local changes to gs://${BUCKET_NAME}..."

# Sync Data Files (trips.json, cityImages.json)
gcloud storage cp src/data/*.json gs://${BUCKET_NAME}/data/

# Sync Public Assets (Images & Docs) - recursive with rsync-like behavior
gcloud storage cp -r public/images gs://${BUCKET_NAME}/public/
gcloud storage cp -r public/documents gs://${BUCKET_NAME}/public/

echo "✅ Data synced to bucket (overrides container content)"
echo "📦 Uploading source to staging bucket..."
gcloud builds submit --tag ${IMAGE_PATH} . --gcs-source-staging-dir=gs://${BUCKET_NAME}/source
echo "✅ Image built & pushed via Cloud Build"

# Step 4: Deploy to Cloud Run
echo ""
echo "☁️ [4/4] Deploying to Cloud Run..."

# Try to auto-detect API key
if [ -f .env.local ]; then
    echo "🔑 Found .env.local, attempting to read GEMINI_API_KEY..."
    # Extract value after = sign, removing quotes and whitespace
    GEMINI_API_KEY=$(grep GEMINI_API_KEY .env.local | cut -d '=' -f2 | tr -d '"'\'' ')
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo "Enter your Gemini API Key (hidden):"
    read -s GEMINI_API_KEY
else
    echo "✅ API Key loaded automatically"
fi

gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_PATH} \
  --region=${REGION} \
  --allow-unauthenticated \
  --set-env-vars=GEMINI_API_KEY="${GEMINI_API_KEY}" \
  --execution-environment=gen2

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "You can access your app at the URL above."
