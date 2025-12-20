
import { getStorage } from "firebase-admin/storage";
import { db } from "./firebase"; // Ensures initialization
import path from "path";

// Bucket name
const BUCKET_NAME = "travelapp05-travel-data";

export async function uploadToGCS(fileBuffer: Buffer, destinationPath: string, contentType?: string): Promise<string> {
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET_NAME);

    // Remove leading slash if present to avoid folder issues
    const cleanPath = destinationPath.startsWith('/') ? destinationPath.slice(1) : destinationPath;

    const file = bucket.file(cleanPath);

    await file.save(fileBuffer, {
        metadata: {
            contentType: contentType,
        },
        public: true, // Make publicly readable as per user requirement
    });

    // Return the public URL
    // Format: https://storage.googleapis.com/BUCKET_NAME/PATH
    return `https://storage.googleapis.com/${BUCKET_NAME}/${cleanPath}`;
}

export async function deleteFromGCS(storageUrlOrPath: string) {
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET_NAME);

    let filePath;
    if (storageUrlOrPath.startsWith("http")) {
        // extract path from URL
        const prefix = `https://storage.googleapis.com/${BUCKET_NAME}/`;
        if (storageUrlOrPath.startsWith(prefix)) {
            filePath = storageUrlOrPath.replace(prefix, "");
        } else {
            return; // Not our bucket
        }
    } else {
        filePath = storageUrlOrPath.startsWith('/') ? storageUrlOrPath.slice(1) : storageUrlOrPath;
    }

    try {
        await bucket.file(filePath).delete();
    } catch (e) {
        console.warn("Failed to delete file from GCS:", filePath, e);
    }
}
