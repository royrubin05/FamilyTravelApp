"use server";

import { db } from "@/lib/firebase";
import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

const BACKGROUNDS_DIR = path.join(process.cwd(), "public/images/backgrounds");

async function ensureDir() {
    try {
        await fs.access(BACKGROUNDS_DIR);
    } catch {
        await fs.mkdir(BACKGROUNDS_DIR, { recursive: true });
    }
}

export async function getSettings() {
    try {
        const doc = await db.collection("settings").doc("global").get();
        if (doc.exists) {
            return doc.data();
        }
        return { backgroundImage: null };
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { backgroundImage: null };
    }
}

export async function uploadBackgroundImage(formData: FormData) {
    const file = formData.get("file") as File;

    if (!file) {
        return { success: false, error: "No file provided" };
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `bg-${Date.now()}.${ext}`;
    const filePath = path.join(BACKGROUNDS_DIR, fileName);
    const publicPath = `/images/backgrounds/${fileName}`;

    try {
        await ensureDir();

        // Save file locally (Synced to GCS via volume mount)
        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));

        // Update Settings in Firestore
        await db.collection("settings").doc("global").set({ backgroundImage: publicPath }, { merge: true });

        revalidatePath("/");

        return { success: true, imagePath: publicPath };
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
