import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments, emails } from "@/lib/db/schema";
import { and, count, desc, ilike, inArray, or, sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { sessionUser } from "@/lib/authz";
import { emailScopeCondition } from "@/lib/address-access";
import { getClientIP, logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/emails?page=1&limit=20&search=&domain=
 * Dipakai aplikasi mobile (session cookie, bukan API key).
 */
export async function GET(request: Request) {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || 20)
  );
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim();
  const domain = url.searchParams.get("domain")?.trim();

  const conditions = [emailScopeCondition(user.id, user.role)];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(emails.toAddress, pattern),
        ilike(emails.fromAddress, pattern),
        ilike(emails.subject, pattern)
      )
    );
  }

  if (domain && domain !== "all") {
    conditions.push(
      sql`${emails.domainId} IN (SELECT id FROM domains WHERE domain = ${domain} OR id = ${domain})`
    );
  }

  const where = and(...conditions);

  const totalResult = (
    await db.select({ count: count() }).from(emails).where(where)
  )[0];
  const total = Number(totalResult?.count ?? 0);

  const rows = await db
    .select({
      id: emails.id,
      messageId: emails.messageId,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      toAddress: emails.toAddress,
      subject: emails.subject,
      preview: emails.preview,
      receivedAt: emails.receivedAt,
      isRead: emails.isRead,
      label: emails.label,
      otpCode: emails.otpCode,
      hasAttachments: sql<boolean>`EXISTS(SELECT 1 FROM attachments WHERE attachments.email_id = emails.id)`,
    })
    .from(emails)
    .where(where)
    .orderBy(desc(emails.receivedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    emails: rows.map((row) => ({
      ...row,
      from: row.fromAddress,
      to: row.toAddress,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

/**
 * DELETE /api/dashboard/emails
 * Body: { id: "..." } atau { ids: ["...", "..."] }
 */
export async function DELETE(request: Request) {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { id?: string; ids?: string[] };
    const ids = Array.from(
      new Set([
        ...(Array.isArray(payload.ids) ? payload.ids : []),
        ...(payload.id ? [payload.id] : []),
      ])
    ).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    const scope = emailScopeCondition(user.id, user.role);
    const allowed = await db
      .select({ id: emails.id })
      .from(emails)
      .where(and(inArray(emails.id, ids), scope));

    const allowedIds = allowed.map((row) => row.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    const atts = await db
      .select({ storagePath: attachments.storagePath })
      .from(attachments)
      .where(inArray(attachments.emailId, allowedIds));

    for (const att of atts) {
      const filePath = path.join(process.cwd(), "data/uploads", att.storagePath);
      await fs.unlink(filePath).catch(() => {});
    }

    await db.delete(emails).where(inArray(emails.id, allowedIds));

    await logAudit({
      userId: user.id,
      action: "delete_email",
      resource: "email",
      details: {
        count: allowedIds.length,
        ids: allowedIds.slice(0, 20),
      },
      ipAddress: getClientIP(request),
    });

    return NextResponse.json({ success: true, deleted: allowedIds.length });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
