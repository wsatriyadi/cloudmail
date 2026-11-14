import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments, emails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sessionUser } from "@/lib/authz";
import { ownEmailScopeFor } from "@/lib/address-access";
import { getEmailWithBody } from "@/lib/email-body";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/emails/[id]
 * Detail email untuk aplikasi mobile, sekaligus menandai sudah dibaca.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  }

  const { id } = await params;
  const email = await getEmailWithBody(id);

  if (!email) {
    return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 404 });
  }

  const scope = await ownEmailScopeFor(user.id);
  if (
    !scope.some(
      (address) => address.toLowerCase() === email.toAddress.toLowerCase()
    )
  ) {
    return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 404 });
  }

  if (!email.isRead) {
    await db.update(emails).set({ isRead: true }).where(eq(emails.id, id));
  }

  const atts = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      mimeType: attachments.mimeType,
      size: attachments.size,
    })
    .from(attachments)
    .where(eq(attachments.emailId, id));

  return NextResponse.json({
    id: email.id,
    messageId: email.messageId,
    from: email.fromAddress,
    fromName: email.fromName,
    to: email.toAddress,
    subject: email.subject,
    preview: email.preview,
    textBody: email.textBody,
    htmlBody: email.htmlBody,
    receivedAt: email.receivedAt,
    isRead: true,
    label: email.label,
    otpCode: email.otpCode,
    hasAttachments: atts.length > 0,
    attachments: atts.map((att) => ({
      ...att,
      downloadUrl: `/api/inbox/attachment/${att.id}`,
    })),
    headers: email.rawHeaders,
  });
}
