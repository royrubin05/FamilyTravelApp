#!/bin/bash
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project selected. Please run 'gcloud config set project [PROJECT_ID]' first."
    exit 1
fi

BUCKET_NAME="${PROJECT_ID}-travel-data"
echo "🔍 Using Project: $PROJECT_ID"
echo "🔍 Source Bucket: gs://${BUCKET_NAME}"
echo ""
echo "⚠️  WARNING: This will OVERWRITE your local data (trips.json, images) with the version from the Cloud."
echo "    Useful if you added trips on the live site and want to save them to GitHub."
echo ""
read -p "Are you sure you want to proceed? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "📥 [1/3] Downloading Data Files..."
gcloud storage cp gs://${BUCKET_NAME}/data/*.json src/data/

echo ""
echo "📥 [2/3] Downloading New Documents..."
# Use -n (no-clobber) to only download new files, or just cp -r to sync
# standard cp -r with gcloud storage is efficient
gcloud storage cp -r gs://${BUCKET_NAME}/public/documents public/

echo ""
echo "📥 [3/3] Downloading New Images..."
gcloud storage cp -r gs://${BUCKET_NAME}/public/images public/

echo ""
echo "✅ Sync Complete!"
echo "   1. Check your local dashboard to verify the data."
echo "   2. Run 'git diff' to see what changed."
echo "   3. Commit and push to GitHub to save these changes."
