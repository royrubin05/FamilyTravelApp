"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

const DATA_FILE = path.join(process.cwd(), "src/data/cityImages.json");
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
        const data = await fs.readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
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

        // Save file
        const arrayBuffer = await file.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));

        // Update JSON
        const images = await getCityImages();
        images[cityKey] = publicPath;
        await fs.writeFile(DATA_FILE, JSON.stringify(images, null, 2));

        revalidatePath("/");
        revalidatePath("/trip");

        return { success: true, imagePath: publicPath };
    } catch (error) {
        console.error("Upload failed", error);
        return { success: false, error: "Upload failed" };
    }
}
