import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, attachments, domains, settings, aliases } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { verifyWorkerSignature } from "@/lib/worker-auth";
import { extractOTP, categorizeEmail } from "@/lib/email-utils";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const timestamp = request.headers.get("X-Worker-Timestamp");
    const signature = request.headers.get("X-Worker-Signature");
    const body = await request.text();

    const isValid = await verifyWorkerSignature(body, timestamp, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
    }

    const payload = JSON.parse(body);

    const toDomain = payload.to.split("@")[1];
    const domain = db.select().from(domains).where(and(eq(domains.domain, toDomain), eq(domains.isActive, true))).get();

    if (!domain) {
      return NextResponse.json({ error: "Domain tidak ditemukan atau nonaktif" }, { status: 404 });
    }

    // Check if target address has an expired alias
    const alias = db.select().from(aliases).where(eq(aliases.address, payload.to)).get();
    if (alias && alias.expiresAt && alias.expiresAt < new Date()) {
      return NextResponse.json({ error: "Alamat sudah kedaluwarsa" }, { status: 410 });
    }

    // Deduplicate by messageId
    if (payload.messageId) {
      const existing = db.select({ id: emails.id }).from(emails).where(eq(emails.messageId, payload.messageId)).get();
      if (existing) {
        return NextResponse.json({ status: "duplicate", id: existing.id });
      }
    }

    const emailId = nanoid();
    const otpCode = extractOTP(payload.textBody);
    const label = categorizeEmail(payload.subject || "", payload.textBody);

    db.insert(emails)
      .values({
        id: emailId,
        messageId: payload.messageId || null,
        fromAddress: payload.from,
        fromName: payload.fromName || null,
        toAddress: payload.to,
        subject: payload.subject || "(tanpa subjek)",
        textBody: payload.textBody || null,
        htmlBody: payload.htmlBody || null,
        preview: payload.preview || null,
        domainId: domain.id,
        label,
        otpCode,
        rawHeaders: payload.headers ? JSON.stringify(payload.headers) : null,
        receivedAt: payload.receivedAt ? new Date(payload.receivedAt) : new Date(),
      })
      .run();

    if (payload.attachments && Array.isArray(payload.attachments)) {
      for (const att of payload.attachments) {
        const attId = nanoid();
        const storagePath = `attachments/${emailId}/${attId}-${att.filename}`;
        const fullPath = path.join(process.cwd(), "data/uploads", storagePath);

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, Buffer.from(att.contentBase64, "base64"));

        db.insert(attachments)
          .values({ id: attId, emailId, filename: att.filename, mimeType: att.mimeType, size: att.size, storagePath })
          .run();
      }
    }

    // Fire webhook
    const webhookSetting = db.select().from(settings).where(eq(settings.key, "webhook_url")).get();
    if (webhookSetting?.value) {
      fetch(webhookSetting.value, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "email.received",
          email: { id: emailId, to: payload.to, from: payload.from, subject: payload.subject, otpCode, label },
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ status: "ok", id: emailId, otpCode, label });
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
