export const BUCKET_NAME = "travelapp05-travel-data";
export const STORAGE_BASE_URL = `https://storage.googleapis.com/${BUCKET_NAME}/public`;

export function getStorageUrl(path: string) {
    if (!path) return "";
    if (path.startsWith("http")) return path;

    // In development, point to GCS to access files that might not be locally present.
    // In production (Cloud Run), the files are mounted to the container, so relative paths work (and are faster/secure).
    // However, user specifically asked for "cloud storage" links.
    // If we want to force GCS everywhere:
    // return `${STORAGE_BASE_URL}${path}`;

    // Hybrid approach: Use GCS in dev, relative in prod?
    // User complaint "linking to localhost" implies they are in Dev or hover text bothers them.
    // Let's force GCS for /documents/ paths if that's what is requested.

    if (path.startsWith("/documents/")) {
        return `${STORAGE_BASE_URL}${path}`;
    }

    return path;
}
