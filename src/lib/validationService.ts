
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "@/lib/ai-config";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type ValidationStatus = "VALID" | "INVALID";

export interface ValidationResult {
    status: ValidationStatus;
    score: number;
    reason: string;
    explanation: string;
}

const VALIDATION_SYSTEM_PROMPT = `
You are an expert Travel Booking Classifier for a travel management platform.

Your Task: Analyze the provided email content (Subject and Body) and determine if it is a transactional booking confirmation for a travel product (e.g., flight, hotel, car rental, train, activity/tour).

Criteria for VALID (It is a booking):
- The email contains clear, specific transactional details for a future trip.
- Look for explicit identifiers like Confirmation Numbers, PNRs, Record Locators, E-Ticket Numbers, or Booking References.
- Look for specific travel dates (check-in/out, departure/arrival) and times.
- The primary purpose of the email is to confirm a purchase or reservation.

Criteria for INVALID (It is NOT a booking):
- Marketing emails, newsletters, "deals of the week," or general travel inspiration.
- Emails that are purely informational itineraries without booking confirmations attached.
- Receipts for non-travel items.
- Account notifications (password resets, privacy policy updates), surveys, or customer service ticketing threads.

Output instruction: Analyze the input and return a structured JSON object containing your final classification status (VALID or INVALID), a confidence score (0.0 to 1.0), a short enumerated reason code for the decision, and a brief one-sentence explanation. Return ONLY raw JSON with no markdown formatting.

Format:
{
  "status": "VALID" | "INVALID",
  "score": 0.0 - 1.0,
  "reason": "CONFIRMATION_FOUND" | "MARKETING" | "NO_DATES" | "RECEIPT_only",
  "explanation": "String"
}
`;

export const EmailValidationService = {
    async validateEmail(subject: string, bodyText: string): Promise<ValidationResult> {
        try {
            const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL_NAME,
                systemInstruction: VALIDATION_SYSTEM_PROMPT
            });

            // Truncate body if excessively long to avoid token limits (Gemini 1.5/2.0 has large context but good to be safe/cost-aware)
            // 20k chars is plenty for validation
            const truncatedBody = bodyText.slice(0, 20000);

            const prompt = `
            Subject: ${subject}
            
            Body:
            ${truncatedBody}
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const data = JSON.parse(jsonStr);

            return {
                status: data.status,
                score: typeof data.score === 'number' ? data.score : 0,
                reason: data.reason || "UNKNOWN",
                explanation: data.explanation || ""
            };

        } catch (error) {
            console.error("Email Validation Failed:", error);
            // Default to INVALID if validation fails to fail safe, or could default to VALID to unblock? 
            // Validating -> Invalidating allows manual review.
            // Let's return a "Error" state masked as INVALID with low score
            return {
                status: "INVALID",
                score: 0,
                reason: "VALIDATION_ERROR",
                explanation: (error as Error).message
            };
        }
    }
};
