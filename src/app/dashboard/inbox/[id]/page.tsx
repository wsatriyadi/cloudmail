import { db } from "@/lib/db";
import { emails, attachments } from "@/lib/db/schema";
import { getEmailWithBody } from "@/lib/email-body";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { emailScopeCondition } from "@/lib/address-access";
import { requireUser } from "@/lib/authz";
import { EmailViewer } from "@/components/inbox/email-viewer";

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const email = getEmailWithBody(id);
  if (!email) notFound();
  const scope = emailScopeCondition(user.id, user.role);
  if (scope && !db.select({ id: emails.id }).from(emails).where(and(eq(emails.id, id), scope)).get()) notFound();


  if (!email.isRead) {
    db.update(emails).set({ isRead: true }).where(eq(emails.id, id)).run();
  }

  const emailAttachments = db
    .select({ id: attachments.id, filename: attachments.filename, mimeType: attachments.mimeType, size: attachments.size })
    .from(attachments)
    .where(eq(attachments.emailId, id))
    .all();

  return (
    <EmailViewer
      email={{
        id: email.id,
        fromAddress: email.fromAddress,
        fromName: email.fromName,
        toAddress: email.toAddress,
        subject: email.subject,
        textBody: email.textBody,
        htmlBody: email.htmlBody,
        rawHeaders: email.rawHeaders,
        receivedAt: email.receivedAt,
        label: email.label,
        otpCode: email.otpCode,
      }}
      attachments={emailAttachments}
    />
  );
}
