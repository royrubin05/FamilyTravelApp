
import { EmailIngestionService } from "../src/lib/emailService";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTests() {
    console.log("=== Starting Validation Test ===\n");

    // 1. Test Case: VALID Booking
    console.log("--- Test Case 1: VALID Booking ---");
    const validPayload = {
        from: "confirmations@united.com", // Needs to match a user in DB, but we might fail on 'User not found' if not careful
        // We need a real user to pass "User Identity" step.
        // I will trust the user has a "forwardingEmails" setup or I will mock findUserByEmail if needed? 
        // Actually, let's try to mock the internal behavior if possible, or just expect 'User not found' but 'Validation' happens AFTER user check?
        // Wait, validation happens AFTER user check. So I need a valid user email.
        // I'll check 'User not found' error.

        subject: "eTicket Itinerary and Receipt for Confirmation D5B88K",
        text: `
            Thank you for choosing United.
            Confirmation Code: D5B88K
            
            Flight: UA 645
            Depart: SFO - San Francisco, CA
            Mar 15, 2026, 10:00 AM
            
            Arrive: JFK - New York, NY
            Mar 15, 2026, 6:30 PM
            
            Passenger: Roy Rubin
        `
    };

    // 2. Test Case: INVALID Junk
    console.log("\n--- Test Case 2: INVALID Junk ---");
    const invalidPayload = {
        from: "newsletter@travel-inspiration.com",
        subject: "10 Best Places to Visit this Summer!",
        text: `
            Check out our top picks for summer travel!
            1. Paris
            2. London
            3. Tokyo
            
            Book now and save 10%!
            
            (No confirmation numbers, no dates, just marketing)
        `
    };

    // I need to mock 'findUserByEmail' to return a dummy user so we proceed to validation
    const originalFindUser = EmailIngestionService.findUserByEmail;
    EmailIngestionService.findUserByEmail = async () => ({ uid: "test-user-123" });

    // Mock DB and Email sending to avoid side effects?
    // For this e2e test, I actually want to hit the real validation service (Gemini).
    // But I don't want to save to real DB if possible. 
    // The code saves to 'admin_quarantine'. That's fine, I can check it there.
    // The code saves 'trips'. I might create a junk trip.

    // I'll just run it. If it fails on 'GCS' or 'Firestore', that's acceptable as long as Validation passes.

    try {
        console.log(">> Sending VALID payload...");
        const res1 = await EmailIngestionService._processCore({
            from: validPayload.from,
            subject: validPayload.subject,
            textBody: validPayload.text,
            attachments: []
        });
        console.log("Result 1:", res1.success ? "SUCCESS" : "FAILED", res1.error || "");

        console.log("\n>> Sending INVALID payload...");
        const res2 = await EmailIngestionService._processCore({
            from: invalidPayload.from,
            subject: invalidPayload.subject,
            textBody: invalidPayload.text,
            attachments: []
        });
        console.log("Result 2:", res2.success ? "SUCCESS" : "FAILED", res2.error || "");
        if (!res2.success && res2.error === "Email rejected by validation service") {
            console.log("✅ CORRECTLY REJECTED");
        } else {
            console.log("❌ FAILED TO REJECT");
        }

    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        // Restore
        EmailIngestionService.findUserByEmail = originalFindUser;
    }
}

runTests();
