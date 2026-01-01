
import { db } from "./firebase";
// We will use a local interface for Inbound Payload compatible with SendGrid/Webhooks

export interface InboundEmailPayload {
    from: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        contentType: string;
        content: Buffer; // Raw buffer
    }>;
}

export const EmailIngestionService = {
    /**
     * Option A: Webhook (SendGrid)
     * Process an inbound email payload from a webhook
     */
    async processInboundEmail(payload: InboundEmailPayload) {
        console.log(`[EmailService] Processing Webhook email from: ${payload.from}`);
        return this._processCore({
            from: payload.from,
            subject: payload.subject,
            textBody: payload.text || payload.html || "",
            attachments: payload.attachments || []
        });
    },

    /**
     * Option B: Gmail Polling (IMAP)
     * Fetch unread emails from Gmail, process them, and mark as read/move them.
     */
    async pollGmailAndProcess() {
        console.log("[EmailService] Starting Gmail Polling...");

        // Import here to ensure dependencies are loaded
        const imaps = (await import('imap-simple')).default;
        const { simpleParser } = await import('mailparser');

        const config = {
            imap: {
                user: process.env.EMAIL_USER as string,
                password: process.env.EMAIL_PASSWORD as string,
                host: process.env.EMAIL_HOST || 'imap.gmail.com',
                port: 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 10000,
            },
        };

        if (!config.imap.user || !config.imap.password) {
            return { success: false, error: "Missing EMAIL_USER or EMAIL_PASSWORD env vars" };
        }

        let connection;
        const results = [];

        try {
            connection = await imaps.connect(config);
            await connection.openBox('INBOX');

            // Fetch UNSEEN (Unread) messages
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = {
                bodies: ['HEADER', 'TEXT', ''], // Full body
                markSeen: true, // Mark as read immediately to prevent loop
            };

            const messages = await connection.search(searchCriteria, fetchOptions);
            console.log(`[EmailService] Found ${messages.length} unread emails.`);

            for (const message of messages) {
                const all = message.parts.find((part: any) => part.which === '');
                const id = message.attributes.uid;
                const idHeader = "Imap-Id: " + id + "\r\n";

                if (all) {
                    const parsed = await simpleParser(idHeader + all.body);

                    const attachments = (parsed.attachments || []).map(att => ({
                        filename: att.filename || 'unknown',
                        contentType: att.contentType,
                        content: att.content // Buffer
                    }));

                    const fromText = parsed.from?.text || "Unknown";

                    // Process
                    const result = await this._processCore({
                        from: fromText,
                        subject: parsed.subject || "No Subject",
                        textBody: parsed.text || parsed.html || "", // Prefer text
                        attachments: attachments
                    });

                    results.push({ id, ...result });
                }
            }

            return { success: true, processedCount: results.length, details: results };

        } catch (error) {
            console.error("[EmailService] IMAP Polling Error:", error);
            // Don't fail the whole request, just return error detail
            return { success: false, error: (error as Error).message };
        } finally {
            if (connection) {
                connection.end();
            }
        }
    },

    /**
     * Shared Core Logic: Identify -> Extract -> Save
     * Payload Normalized to: { from, subject, textBody, attachments }
     */
    async _processCore(email: { from: string, subject: string, textBody: string, attachments: any[], bypassValidation?: boolean }) {
        // 1. Extract clean email address
        const senderEmail = this.extractEmailAddress(email.from);
        if (!senderEmail) return { success: false, error: "Invalid sender email" };

        // 2. Identify User
        const user = await this.findUserByEmail(senderEmail);
        if (!user) {
            console.warn(`[EmailService] No user found for email: ${senderEmail}`);
            return { success: false, error: "User not found" };
        }
        console.log(`[EmailService] Identified user: ${user.uid}`);

        // --- VALIDATION STEP ---
        if (!email.bypassValidation) {
            const { EmailValidationService } = await import("./validationService");
            console.log(`[EmailService] Validating email: "${email.subject}"`);

            const validationResult = await EmailValidationService.validateEmail(email.subject, email.textBody);
            console.log(`[EmailService] Validation Result: ${validationResult.status} (Score: ${validationResult.score})`);

            // Routing Logic
            const isValid = validationResult.status === "VALID" && validationResult.score > 0.85;

            if (!isValid) {
                console.warn(`[EmailService] Email REJECTED. Reason: ${validationResult.reason}`);

                // Action A: Quarantine Store
                const docRef = await db.collection("admin_quarantine").add({
                    rawPayload: email, // Store full payload
                    userId: user.uid,
                    userEmail: senderEmail,
                    validation: validationResult,
                    receivedAt: new Date().toISOString(),
                    status: "REJECTED_AUTO",
                    subject: email.subject
                });

                // Action B: User Notification
                await this.sendRejectionEmail(senderEmail, email.subject, docRef.id);

                return { success: false, error: "Email rejected by validation service", rejection: validationResult };
            }
        }

        // 3. Select Content to Parse
        let parseTarget: { buffer: Buffer; mimeType: string } | null = null;
        let sourceName = "email_body.txt"; // Default filename for non-attachment emails

        const pdfAttachment = email.attachments.find(a => a.contentType === "application/pdf");
        if (pdfAttachment) {
            parseTarget = { buffer: pdfAttachment.content, mimeType: "application/pdf" };
            sourceName = pdfAttachment.filename;
        } else {
            // Fallback to text body
            if (!email.textBody) return { success: false, error: "Empty email content" };
            parseTarget = { buffer: Buffer.from(email.textBody), mimeType: "text/plain" };
        }

        // 4. Extract Trip Data (Gemini)
        const { parseTripWithGemini } = await import("@/lib/GeminiDebug");
        const familyMembers = await this.getUserFamilyMembers(user.uid);
        const geminiResult = await parseTripWithGemini(parseTarget.buffer, parseTarget.mimeType, familyMembers);

        if (!geminiResult.success || !geminiResult.tripData) {
            const errorMsg = geminiResult.error || "Gemini parsing failed";
            console.warn(`[EmailService] Parsing Failed: ${errorMsg}`);

            // If it was a Validation Failure (parsed but content was junk), treat as Soft Rejection
            if (errorMsg.includes("Parsing Validation Failed")) {
                // Action A: Quarantine (Optional visibility)
                await db.collection("admin_quarantine").add({
                    rawPayload: email,
                    userId: user.uid,
                    userEmail: senderEmail,
                    validation: { status: "PARSING_REJECTED", reason: "NO_DESTINATION", score: 0 },
                    receivedAt: new Date().toISOString(),
                    status: "REJECTED_PARSING",
                    subject: email.subject,
                    aiDebug: geminiResult.debugResponse
                });

                // Action B: Notify User
                await this.sendRejectionEmail(senderEmail, email.subject, "N/A"); // No specific record ID for parsing rejection yet

                return { success: false, error: "Email rejected during parsing: No valid destination found." };
            }

            return { success: false, error: errorMsg };
        }

        const tripData = geminiResult.tripData;

        // 5. Normalization
        const { normalizeTravelers } = await import("@/lib/tripUtils");
        if (tripData.travelers && tripData.travelers.length > 0) {
            const normalizedNames = await normalizeTravelers(tripData.travelers, familyMembers);
            // DEDUPLICATION: Use Set to remove exact duplicates
            const uniqueNames = Array.from(new Set(normalizedNames));
            tripData.travelers = uniqueNames.map(name => ({
                name,
                role: "Adult",
                age: "Adult"
            }));
        }

        // Generate ID
        let tripYear = new Date().getFullYear();
        const yearMatch = tripData.dates ? tripData.dates.match(/(\d{4})/) : null;
        if (yearMatch) tripYear = parseInt(yearMatch[1]);

        const safeDest = (tripData.destination || "Unknown").replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const uniqueSuffix = Date.now().toString().slice(-6);
        const tripId = `${safeDest}-${tripYear}-${uniqueSuffix}`;

        // 6. Upload Source Document to GCS
        // Path: users/{uid}/trips/{tripId}/{filename}
        const { uploadToGCS } = await import("@/lib/gcs");
        let sourceDocUrl = "";
        try {
            const gcsPath = `users/${user.uid}/trips/${tripId}/${sourceName}`;
            console.log(`[EmailService] Uploading source doc to: ${gcsPath}`);
            sourceDocUrl = await uploadToGCS(parseTarget.buffer, gcsPath, parseTarget.mimeType);
        } catch (err) {
            console.error("[EmailService] Failed to upload source doc:", err);
            // Non-blocking error, continue saving trip
        }

        const newTrip = {
            id: tripId,
            ...tripData,
            sourceFileName: sourceName,
            sourceDocument: sourceDocUrl, // Add the GCS Link
            sourceEmail: senderEmail,
            uploadedAt: new Date().toISOString(),
            isEmailImport: true
        };

        // 7. Save Trip
        await db.collection("users").doc(user.uid).collection("trips").doc(tripId).set(newTrip);

        console.log(`[EmailService] Successfully imported trip ${tripId} for user ${user.uid}`);

        // 8. Auto-Reply Confirmation
        await this.sendConfirmationEmail(senderEmail, tripData.destination || "Your Trip", tripId);

        return { success: true, tripId };
    },

    async sendRejectionEmail(to: string, originalSubject: string, recordId: string) {
        try {
            const nodemailer = (await import("nodemailer"));
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // Use SSL
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const mailOptions = {
                from: `"Travel Roots" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: `Update regarding your forwarded email: "${originalSubject}"`,
                text: `Hi there,\n\nWe received an email you forwarded to us with the subject line: "${originalSubject}".\n\nOur system automatically analyzed this email to extract travel details, but unfortunately, we were unable to identify a confirmed booking within the content.\n\nThis usually happens if the forwarded email was a newsletter, marketing promotion, account update, or a general itinerary without specific booking confirmation numbers.\n\nIf this email was a valid booking confirmation that we missed: Please let us know if we've made a mistake. Contact the admin with Record ID: ${recordId} so we can investigate and manually add it to your account.\n\nThank you,\nThe Travel Roots Team\n\nRecord ID: ${recordId}`,
                html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <p>Hi there,</p>
                        <p>We received an email you forwarded to us with the subject line: <strong>"${originalSubject}"</strong>.</p>
                        <p>Our system automatically analyzed this email to extract travel details, but unfortunately, we were unable to identify a confirmed booking within the content.</p>
                        <p>This usually happens if the forwarded email was a newsletter, marketing promotion, account update, or a general itinerary without specific booking confirmation numbers.</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 0.9em;">
                            <strong>If this email was a valid booking confirmation that we missed:</strong><br/>
                            Please let us know if we've made a mistake. Contact the admin with <strong>Record ID: ${recordId}</strong> so we can investigate and manually add it to your account.
                        </p>
                        <p>Thank you,<br/>The Travel Roots Team</p>
                        <br/>
                        <p style="font-size: 0.8em; color: #999;">Record ID: ${recordId}</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`[EmailService] Rejection email sent to ${to}`);
        } catch (error) {
            console.error("[EmailService] Failed to send rejection email:", error);
        }
    },

    async sendConfirmationEmail(to: string, tripDestination: string, tripId: string) {
        try {
            const nodemailer = (await import("nodemailer"));
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // Use SSL
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            const dashboardUrl = `https://travel.platform63.com/trip?id=${tripId}`;

            const mailOptions = {
                from: `"Travel Roots" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: `Trip Imported: ${tripDestination}`,
                text: `Success! Your trip to ${tripDestination} has been imported to your dashboard.\n\nView it here: ${dashboardUrl}\n\nHappy Travels!\n\nRecord ID: ${tripId}`,
                html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h2>Trip Imported Successfully! ✈️</h2>
                        <p>Your trip to <strong>${tripDestination}</strong> has been processed and added to your dashboard.</p>
                        <p>
                            <a href="${dashboardUrl}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Trip</a>
                        </p>
                        <p style="margin-top: 20px; font-size: 12px; color: #888;">
                            Automatic reply from Travel Roots.
                        </p>
                        <br/>
                         <p style="font-size: 0.8em; color: #999;">Record ID: ${tripId}</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`[EmailService] Confirmation email sent to ${to}`);
        } catch (error) {
            console.error("[EmailService] Failed to send confirmation email:", error);
            // Do not fail the import if email fails
        }
    },

    extractEmailAddress(raw: string): string | null {
        const match = raw.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        return match ? match[1].toLowerCase() : null;
    },

    async findUserByEmail(email: string) {
        // Collection Group Query for 'forwardingEmails'
        const snapshot = await db.collectionGroup("settings")
            .where("forwardingEmails", "array-contains", email)
            .get();

        if (!snapshot.empty) {
            // Found a settings doc. The parent is the User.
            // users/{uid}/settings/config
            const settingsDoc = snapshot.docs[0];
            const userDoc = settingsDoc.ref.parent.parent;
            if (userDoc) {
                return { uid: userDoc.id };
            }
        }
        return null;
    },

    async getUserFamilyMembers(uid: string) {
        try {
            const doc = await db.collection("users").doc(uid).collection("settings").doc("config").get();
            return doc.exists ? (doc.data()?.familyMembers || []) : [];
        } catch (e) {
            return [];
        }
    }
};
