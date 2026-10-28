import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailBodies, emails } from "@/lib/db/schema";

// Email beserta body-nya. Body ada di tabel terpisah agar query daftar tidak
// membaca isi email yang besar.
export function getEmailWithBody(id: string) {
  return db
    .select({
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
      textBody: emailBodies.textBody,
      htmlBody: emailBodies.htmlBody,
      rawHeaders: emailBodies.rawHeaders,
    })
    .from(emails)
    .leftJoin(emailBodies, eq(emailBodies.emailId, emails.id))
    .where(eq(emails.id, id))
    .get();
}
