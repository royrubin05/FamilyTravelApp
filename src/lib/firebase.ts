import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'travelapp05'
    });
}

const db = getFirestore(admin.app(), 'travelapp05');

export { db };
