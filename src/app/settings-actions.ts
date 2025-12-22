"use server";

import { db } from "@/lib/firebase";
import path from "path";
import { revalidatePath } from "next/cache";

// Removed local dir constants as they are no longer needed


// Helper to sanitize Firestore data
function sanitizeFirestoreData(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => sanitizeFirestoreData(item));
    if (typeof data === 'object') {
        if (data.toDate && typeof data.toDate === 'function') return data.toDate().toISOString();
        const sanitized: any = {};
        for (const key in data) sanitized[key] = sanitizeFirestoreData(data[key]);
        return sanitized;
    }
    return data;
}

export async function getSettings(): Promise<{ backgroundImage: string | null; familyMembers?: any[] }> {
    try {
        const doc = await db.collection("settings").doc("global").get();
        if (doc.exists) {
            const data = doc.data();
            return sanitizeFirestoreData(data) as { backgroundImage: string | null; familyMembers?: any[] };
        }
        // Return default structure if empty
        return { backgroundImage: null, familyMembers: [] };
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { backgroundImage: null, familyMembers: [] };
    }
}

export async function uploadBackgroundImage(formData: FormData) {
    const file = formData.get("file") as File;

    if (!file) {
        return { success: false, error: "No file provided" };
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `bg-${Date.now()}.${ext}`;
    const gcsPath = `images/backgrounds/${fileName}`;

    try {
        const { uploadToGCS } = await import("@/lib/gcs");
        const arrayBuffer = await file.arrayBuffer();
        const publicUrl = await uploadToGCS(Buffer.from(arrayBuffer), gcsPath, file.type);

        // Update Settings in Firestore
        await db.collection("settings").doc("global").set({ backgroundImage: publicUrl }, { merge: true });

        revalidatePath("/");

        return { success: true, imagePath: publicUrl };
    } catch (error) {
        console.error("Background upload failed", error);
        return { success: false, error: "Upload failed" };
    }
}

export async function removeBackgroundImage() {
    try {
        await db.collection("settings").doc("global").set({ backgroundImage: null }, { merge: true });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to remove background" };
    }
}

export async function updateSettings(newSettings: any) {
    try {
        await db.collection("settings").doc("global").set(newSettings, { merge: true });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}
