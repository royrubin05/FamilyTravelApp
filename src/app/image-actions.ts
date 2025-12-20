"use server";

import { db } from "@/lib/firebase";
import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

const UPLOAD_DIR = path.join(process.cwd(), "public/images/destinations");

// Ensure upload directory exists
async function ensureDir() {
    try {
        await fs.access(UPLOAD_DIR);
    } catch {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    }
}

export async function getCityImages() {
    try {
        const doc = await db.collection("city_images").doc("mapping").get();
        if (doc.exists) {
            return doc.data();
        }
        return {};
    } catch (error) {
        console.error("Failed to read city images", error);
        return {};
    }
}

export async function uploadCityImage(formData: FormData) {
    const city = formData.get("city") as string;
    const file = formData.get("file") as File;

    if (!city || !file) {
        return { success: false, error: "Missing city or file" };
    }

    const cityKey = city.toLowerCase().trim();
    const safeName = cityKey.replace(/[^a-z0-9]/g, "-");
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${safeName}-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    const publicPath = `/images/destinations/${fileName}`;

    try {
        await ensureDir();

        // Save file locally (Synced to GCS via volume mount)
        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));

        // Update Mapping in Firestore
        // We use set with merge: true to update just this key, but set with merge
        // expects an object structure. 
        // We can also use update({ [key]: value }) if doc exists.
        // Given we initialized it as a map, let's use set(..., { merge: true })

        await db.collection("city_images").doc("mapping").set({
            [cityKey]: publicPath
        }, { merge: true });

        revalidatePath("/");
        revalidatePath("/trip");

        return { success: true, imagePath: publicPath };
    } catch (error) {
        console.error("Upload failed", error);
        return { success: false, error: "Upload failed" };
    }
}

export async function deleteCityImage(city: string) {
    if (!city) return { success: false, error: "City is required" };

    const cityKey = city.toLowerCase().trim();

    try {
        await db.collection("city_images").doc("mapping").update({
            [cityKey]: FieldValue.delete()
        });

        revalidatePath("/");
        revalidatePath("/trip");
        return { success: true };
    } catch (error) {
        console.error("Delete failed", error);
        return { success: false, error: "Delete failed" };
    }
}
