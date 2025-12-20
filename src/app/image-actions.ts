"use server";

import { db } from "@/lib/firebase";
import path from "path";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";

const UPLOAD_DIR = path.join(process.cwd(), "public/images/destinations");

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
    // Cloud Path
    const gcsPath = `images/destinations/${fileName}`;

    try {
        const { uploadToGCS } = await import("@/lib/gcs");
        const arrayBuffer = await file.arrayBuffer();
        const publicUrl = await uploadToGCS(Buffer.from(arrayBuffer), gcsPath, file.type);

        await db.collection("city_images").doc("mapping").set({
            [cityKey]: publicUrl
        }, { merge: true });

        revalidatePath("/");
        revalidatePath("/trip");

        return { success: true, imagePath: publicUrl };
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
