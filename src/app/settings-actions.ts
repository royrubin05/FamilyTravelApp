"use server";

import { db } from "@/lib/firebase";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-context";

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

export async function getSettings(): Promise<{ backgroundImage: string | null; familyMembers?: any[]; forwardingEmails?: string[]; displayName?: string; isAdmin: boolean }> {
    // Auth check outside try/catch
    const user = await getCurrentUser();

    try {
        // Parallel fetch: Settings Config AND User Profile
        const [settingsDoc, userDoc] = await Promise.all([
            db.collection("users").doc(user.uid).collection("settings").doc("config").get(),
            db.collection("users").doc(user.uid).get()
        ]);

        const settingsData = settingsDoc.exists ? sanitizeFirestoreData(settingsDoc.data()) : { backgroundImage: null, familyMembers: [] };
        const userData = userDoc.exists ? userDoc.data() : {};

        return {
            ...settingsData,
            forwardingEmails: settingsData.forwardingEmails || [],
            displayName: userData?.displayName || "",
            isAdmin: user.role === 'admin'
        };
    } catch (error) {
        console.error("Error fetching settings:", error);
        return { backgroundImage: null, familyMembers: [], forwardingEmails: [], isAdmin: false };
    }
}

export async function updateFamilyProfile(data: { displayName: string }) {
    const user = await getCurrentUser();

    if (!data.displayName || !data.displayName.trim()) {
        return { success: false, error: "Display name is required" };
    }

    try {
        await db.collection("users").doc(user.uid).set({
            displayName: data.displayName.trim()
        }, { merge: true });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to update profile:", error);
        return { success: false, error: "Failed to update profile" };
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
        const user = await getCurrentUser();
        await db.collection("users").doc(user.uid).collection("settings").doc("config").set({ backgroundImage: publicUrl }, { merge: true });

        revalidatePath("/");

        return { success: true, imagePath: publicUrl };
    } catch (error) {
        console.error("Background upload failed", error);
        return { success: false, error: "Upload failed" };
    }
}

export async function removeBackgroundImage() {
    try {
        const user = await getCurrentUser();
        await db.collection("users").doc(user.uid).collection("settings").doc("config").set({ backgroundImage: null }, { merge: true });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to remove background" };
    }
}

export async function updateSettings(newSettings: any) {
    try {
        const user = await getCurrentUser();
        await db.collection("users").doc(user.uid).collection("settings").doc("config").set(newSettings, { merge: true });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

export async function addForwardingEmail(email: string) {
    const user = await getCurrentUser();

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return { success: false, error: "Invalid email format" };
    }

    try {
        const settingsRef = db.collection("users").doc(user.uid).collection("settings").doc("config");
        const doc = await settingsRef.get();
        const currentEmails = (doc.data()?.forwardingEmails || []) as string[];

        const lowerEmail = email.trim().toLowerCase();

        // 1. Check current user's list (Local Uniqueness)
        if (currentEmails.includes(lowerEmail)) {
            return { success: false, error: "Email is already linked to your account" };
        }

        // 2. Check global uniqueness across ALL users
        // This requires a composite index if we were filtering complexly, 
        // but array-contains on a single field in collectionGroup usually works with standard indexes 
        // or will throw an error with a link to create one.
        const existingDocs = await db.collectionGroup("settings")
            .where("forwardingEmails", "array-contains", lowerEmail)
            .get();

        if (!existingDocs.empty) {
            return { success: false, error: "This email is already linked to another account" };
        }

        // Add to array using arrayUnion for atomicity
        const { FieldValue } = await import("firebase-admin/firestore");
        await settingsRef.set({
            forwardingEmails: FieldValue.arrayUnion(lowerEmail)
        }, { merge: true });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to add email:", error);
        return { success: false, error: "Failed to add email" };
    }
}

export async function removeForwardingEmail(email: string) {
    const user = await getCurrentUser();

    try {
        const settingsRef = db.collection("users").doc(user.uid).collection("settings").doc("config");

        // Remove from array using arrayRemove for atomicity
        const { FieldValue } = await import("firebase-admin/firestore");
        await settingsRef.set({
            forwardingEmails: FieldValue.arrayRemove(email.trim().toLowerCase())
        }, { merge: true });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Failed to remove email:", error);
        return { success: false, error: "Failed to remove email" };
    }
}
