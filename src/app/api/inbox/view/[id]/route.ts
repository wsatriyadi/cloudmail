import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails, attachments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const perms = JSON.parse(authResult.apiKey!.permissions) as string[];
  if (!perms.includes("inbox")) {
    return NextResponse.json({ error: "Kunci API tidak memiliki izin 'inbox'" }, { status: 403 });
  }

  const { id } = await params;

  const email = db.select().from(emails).where(eq(emails.id, id)).get();

  if (!email) {
    return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 404 });
  }

  const emailAttachments = db
    .select({ id: attachments.id, filename: attachments.filename, mimeType: attachments.mimeType, size: attachments.size })
    .from(attachments)
    .where(eq(attachments.emailId, id))
    .all();

  if (!email.isRead) {
    db.update(emails).set({ isRead: true }).where(eq(emails.id, id)).run();
  }

  return NextResponse.json({
    id: email.id,
    messageId: email.messageId,
    from: { address: email.fromAddress, name: email.fromName },
    to: email.toAddress,
    subject: email.subject,
    textBody: email.textBody,
    htmlBody: email.htmlBody,
    label: email.label,
    otpCode: email.otpCode,
    headers: email.rawHeaders ? JSON.parse(email.rawHeaders) : null,
    attachments: emailAttachments.map((a) => ({
      ...a,
      downloadUrl: `/api/inbox/attachment/${a.id}`,
    })),
    receivedAt: email.receivedAt,
  });
}
