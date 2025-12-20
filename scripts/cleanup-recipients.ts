
import { db } from '../src/lib/firebase';

async function cleanupRecipients() {
    console.log("Starting cleanup of 'Recipient' travelers...");
    const tripsSnapshot = await db.collection("trips").get();
    let updatedCount = 0;

    for (const doc of tripsSnapshot.docs) {
        const trip = doc.data();
        const travelers = trip.travelers || [];

        const validTravelers = travelers.filter((t: any) => t.role !== 'Recipient');

        // Also normalize 'Organizer' to 'Traveler' if any remain, or check if they should be removed?
        // User said: "should not be any organizer setting or mode".
        // Use conservative approach: Convert Organizer to Traveler for now, unless they were meant to be removed.
        // But for "Recipient", the user specifically cited Roy being added because he received the email but isn't going.
        // So removal for Recipient is safe.

        // Let's also log if we find any "Organizer" just in case.
        const organizers = validTravelers.filter((t: any) => t.role === 'Organizer');
        if (organizers.length > 0) {
            console.log(`Trip ${trip.id} has Organizers: ${organizers.map((o: any) => o.name).join(', ')}`);
            // Convert to Traveler
            validTravelers.forEach((t: any) => {
                if (t.role === 'Organizer') t.role = 'Traveler';
            });
        }

        if (validTravelers.length !== travelers.length || organizers.length > 0) {
            const removedCount = travelers.length - validTravelers.length;
            console.log(`Updating trip ${trip.id}: Removed ${removedCount} recipients.`);

            await db.collection("trips").doc(doc.id).update({
                travelers: validTravelers
            });
            updatedCount++;
        }
    }

    console.log(`Cleanup complete. Updated ${updatedCount} trips.`);
}

cleanupRecipients();
