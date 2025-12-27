"use server";

import { db } from "@/lib/firebase";
import { nanoid } from "nanoid";
import { Trip, TripGroup } from "@/types/trip";
import { getCurrentUser } from "@/lib/auth-context";

// Helper to verify admin auth for toggle operations
// Replaced by getCurrentUser() check inside the action

export async function togglePublicAccess(
    type: 'trip' | 'group',
    id: string,
    isPublic: boolean
) {
    console.log(`[togglePublicAccess] REQUEST: type=${type} id=${id} isPublic=${isPublic}`);

    try {
        // Use getCurrentUser to identify the owner and ensure auth
        const user = await getCurrentUser();
        // Log the user
        console.log(`[togglePublicAccess] User Context:`, user);

        if (!user || !user.uid) {
            console.error("[togglePublicAccess] Unauthorized: No UID found.");
            throw new Error("Unauthorized");
        }

        const collection = type === 'trip' ? 'trips' : 'groups';
        // Direct Path: users/{uid}/{collection}/{id}
        // This avoids Collection Group Index requirements for the owner's own data.
        const docRef = db.collection('users').doc(user.uid).collection(collection).doc(id);

        console.log(`[togglePublicAccess] TARGET PATH: ${docRef.path}`);

        const doc = await docRef.get();
        console.log(`[togglePublicAccess] Doc Exists? ${doc.exists}`);

        if (!doc.exists) {
            console.error(`[togglePublicAccess] Document DOES NOT EXIST at ${docRef.path}`);
            // Let's list the collection to see what IS there (debugging only)
            const list = await db.collection('users').doc(user.uid).collection(collection).limit(5).get();
            console.log(`[togglePublicAccess] Sample docs in ${collection}:`, list.docs.map(d => d.id));

            throw new Error(`${type} not found at expected path`);
        }

        const data = doc.data();
        let shareToken = data?.shareToken;

        console.log(`[togglePublicAccess] Current Data: shareToken=${shareToken}, isPublic=${data?.isPublic}`);

        // If turning ON and no token exists, generate one
        if (isPublic && !shareToken) {
            shareToken = nanoid(12); // Short, unique, URL-safe
            console.log(`[togglePublicAccess] Generated new token: ${shareToken}`);
        }

        await docRef.update({
            isPublic,
            ...(shareToken && { shareToken }) // Only update token if we generated one or it exists
        });

        console.log(`[togglePublicAccess] Update Completed.`);

        return { success: true, shareToken, isPublic };
    } catch (error: any) {
        console.error("[togglePublicAccess] FATAL ERROR:", error);
        return { success: false, error: error.message };
    }
}

export async function getPublicEntity(type: 'trip' | 'group', token: string) {
    try {
        const collection = type === 'trip' ? 'trips' : 'groups';
        const collectionName = type === 'trip' ? 'trips' : 'groups';

        // Query by shareToken using Collection Group
        // db is Admin SDK instance from lib/firebase, so collectionGroup works
        const snapshot = await db.collectionGroup(collectionName)
            .where('shareToken', '==', token)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null; // Not found
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        // Security Check: CRITICAL
        if (data.isPublic !== true) {
            return { error: 'ACCESS_RESTRICTED' }; // Access Denied
        }

        // Fetch Owner Settings (Background Image)
        let backgroundImage = null;
        try {
            const ownerId = doc.ref.parent.parent?.id;
            if (ownerId) {
                const settingsSnap = await db.collection('users').doc(ownerId).collection('settings').doc('config').get();
                if (settingsSnap.exists) {
                    backgroundImage = settingsSnap.data()?.backgroundImage || null;
                }
            }
        } catch (e) {
            console.error("Failed to fetch public owner settings", e);
        }

        return {
            id: doc.id,
            ...data,
            backgroundImage
        } as (Trip | TripGroup) & { backgroundImage?: string };
    } catch (error: any) {
        console.error(`Error fetching public ${type}:`, error);
        if (error.code === 9 || error.toString().includes("FAILED_PRECONDITION")) {
            console.error("⚠️  MISSING INDEX DETECTED  ⚠️");
            console.error("This feature requires a Firestore Index to query across subcollections.");
            console.error("Look closely at the error above/below in your TERMINAL for a link starting with 'https://console.firebase.google.com/...'");
            console.error("Click that link to create the index automatically.");
        }
        return null; // Treated as 404
    }
}

export async function getPublicGroupTrip(groupToken: string, tripId: string) {
    try {
        // 1. Verify Group is Public
        const groupSnapshot = await db.collectionGroup('groups')
            .where('shareToken', '==', groupToken)
            .limit(1)
            .get();

        if (groupSnapshot.empty) return null;

        const groupDoc = groupSnapshot.docs[0];
        const groupData = groupDoc.data();
        if (groupData.isPublic !== true) {
            return { error: 'ACCESS_RESTRICTED' };
        }

        // Fetch Owner Settings (Background Image) - from Group Owner
        let backgroundImage = null;
        try {
            const ownerId = groupDoc.ref.parent.parent?.id;
            if (ownerId) {
                const settingsSnap = await db.collection('users').doc(ownerId).collection('settings').doc('config').get();
                if (settingsSnap.exists) {
                    backgroundImage = settingsSnap.data()?.backgroundImage || null;
                }
            }
        } catch (e) {
            console.error("Failed to fetch public group owner settings", e);
        }

        // 2. Verify Trip is in Group
        const groupIds: string[] = groupData.ids || [];
        if (!groupIds.includes(tripId)) return null;

        // 3. Fetch Trip
        const tripSnapshot = await db.collectionGroup('trips')
            .where('id', '==', tripId)
            .limit(1)
            .get();

        if (tripSnapshot.empty) return null;

        return {
            id: tripSnapshot.docs[0].id,
            ...tripSnapshot.docs[0].data(),
            backgroundImage
        } as Trip & { backgroundImage?: string };
    } catch (error) {
        console.error("Error fetching public group trip:", error);
        return null; // Fail safe
    }
}
