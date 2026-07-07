import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const perms = JSON.parse(authResult.apiKey!.permissions) as string[];
  if (!perms.includes("inbox")) {
    return NextResponse.json({ error: "Kunci API tidak memiliki izin 'inbox'" }, { status: 403 });
  }

  const { email } = await params;
  const emailAddress = decodeURIComponent(email);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  const results = db
    .select({
      id: emails.id,
      from: emails.fromAddress,
      fromName: emails.fromName,
      subject: emails.subject,
      preview: emails.preview,
      receivedAt: emails.receivedAt,
      isRead: emails.isRead,
      label: emails.label,
      otpCode: emails.otpCode,
      hasAttachments: sql<boolean>`EXISTS(SELECT 1 FROM attachments WHERE attachments.email_id = ${emails.id})`,
    })
    .from(emails)
    .where(eq(emails.toAddress, emailAddress))
    .orderBy(desc(emails.receivedAt))
    .limit(limit)
    .offset(offset)
    .all();

  const countResult = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(emails)
    .where(eq(emails.toAddress, emailAddress))
    .get();

  const total = countResult?.count ?? 0;

  return NextResponse.json({
    emails: results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
