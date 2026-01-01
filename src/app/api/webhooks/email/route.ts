
import { NextRequest, NextResponse } from "next/server";
import { EmailIngestionService } from "@/lib/emailService";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const from = formData.get("from") as string;
        const subject = formData.get("subject") as string;
        const text = (formData.get("text") as string) || "";
        const html = (formData.get("html") as string) || "";

        // Handle Attachments (SendGrid specific logic needed for robust parsing)
        // SendGrid sends "attachments" as count, and keys as "attachment1", etc.
        // For V1, let's focus on the Text/HTML body if no file logic is perfect yet.
        // OR we try to extract files.
        // Simplified: extracting text body for AI to read forwarded email text.

        if (!from) {
            return NextResponse.json({ error: "Missing sender" }, { status: 400 });
        }

        const result = await EmailIngestionService.processInboundEmail({
            from,
            subject,
            text,
            html,
            attachments: [] // TODO: Extract attachments from formData if needed
        });

        if (!result.success) {
            console.error("Email processing failed:", result.error);
            // Return 200 to webhook provider to stop retries on logic errors (unless transient)
            return NextResponse.json({ success: false, error: result.error }, { status: 200 });
        }

        return NextResponse.json({ success: true, tripId: result.tripId });
    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
