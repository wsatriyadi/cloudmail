import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailBodies, emails } from "@/lib/db/schema";

// Selama migrasi, email lama masih menyimpan body di kolom `emails`.
// Ambil dari email_bodies dulu; jika belum dipindah, baca kolom lama.
export function getEmailWithBody(id: string) {
  const row = db
    .select({
      email: {
        id: emails.id,
        messageId: emails.messageId,
        fromAddress: emails.fromAddress,
        fromName: emails.fromName,
        toAddress: emails.toAddress,
        subject: emails.subject,
        preview: emails.preview,
        isRead: emails.isRead,
        label: emails.label,
        otpCode: emails.otpCode,
        receivedAt: emails.receivedAt,
      },
      body: emailBodies,
    })
    .from(emails)
    .leftJoin(emailBodies, eq(emailBodies.emailId, emails.id))
    .where(eq(emails.id, id))
    .get();
  if (!row) return undefined;

  const body =
    row.body ??
    db
      .select({ textBody: emails.textBody, htmlBody: emails.htmlBody, rawHeaders: emails.rawHeaders })
      .from(emails)
      .where(eq(emails.id, id))
      .get()!;

  return {
    ...row.email,
    textBody: body.textBody,
    htmlBody: body.htmlBody,
    rawHeaders: body.rawHeaders,
  };
}
