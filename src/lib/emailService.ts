import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export interface EmailAttachment {
    filename: string;
    content: string; // Base64
    contentType: string;
}

export interface ParsedEmail {
    uid: number;
    subject: string;
    from: string;
    date: Date;
    textBody: string;
    attachments: EmailAttachment[];
}

export async function fetchUnreadEmails(): Promise<ParsedEmail[]> {
    const config = {
        imap: {
            user: process.env.EMAIL_USER as string,
            password: process.env.EMAIL_PASSWORD as string,
            host: process.env.EMAIL_HOST || 'imap.gmail.com',
            port: 993,
            tls: true,
            authTimeout: 3000,
        },
    };

    if (!config.imap.user || !config.imap.password) {
        console.error("Missing EMAIL_USER or EMAIL_PASSWORD");
        return [];
    }

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''], // Empty string retrieves the raw full body
            markSeen: true,
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        const parsedEmails: ParsedEmail[] = [];

        for (const message of messages) {
            const all = message.parts.find((part: any) => part.which === '');
            const id = message.attributes.uid;
            const idHeader = "Imap-Id: " + id + "\r\n";

            if (all) {
                const parsed = await simpleParser(idHeader + all.body);

                const attachments: EmailAttachment[] = [];
                if (parsed.attachments) {
                    for (const att of parsed.attachments) {
                        attachments.push({
                            filename: att.filename || 'unknown',
                            content: att.content.toString('base64'),
                            contentType: att.contentType
                        });
                    }
                }

                parsedEmails.push({
                    uid: message.attributes.uid,
                    subject: parsed.subject || 'No Subject',
                    from: parsed.from?.text || 'Unknown',
                    date: parsed.date || new Date(),
                    textBody: parsed.text || parsed.html || '', // Prefer text, fallback to HTML
                    attachments
                });
            }
        }

        connection.end();
        return parsedEmails;
    } catch (error) {
        console.error("Error fetching emails:", error);
        return [];
    }
}
