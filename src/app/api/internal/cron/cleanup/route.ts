import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, attachments, rateLimitEntries, settings } from "@/lib/db/schema";
import { eq, lt, sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const retentionSetting = db.select().from(settings).where(eq(settings.key, "email_retention_days")).get();

    const retentionDays = parseInt(retentionSetting?.value || "30");
    if (retentionDays === 0) {
      return NextResponse.json({ deleted: 0, message: "Retensi diatur ke selamanya" });
    }

    const cutoffEpoch = Math.floor((Date.now() - retentionDays * 24 * 60 * 60 * 1000) / 1000);

    const oldEmails = db.select({ id: emails.id }).from(emails).where(sql`${emails.receivedAt} < ${cutoffEpoch}`).all();

    for (const email of oldEmails) {
      const atts = db.select({ storagePath: attachments.storagePath }).from(attachments).where(eq(attachments.emailId, email.id)).all();
      for (const att of atts) {
        const filePath = path.join(process.cwd(), "data/uploads", att.storagePath);
        await fs.unlink(filePath).catch(() => {});
      }
    }

    if (oldEmails.length > 0) {
      db.delete(emails).where(sql`${emails.receivedAt} < ${cutoffEpoch}`).run();
    }

    const rateLimitCutoff = Math.floor(Date.now() / 1000 / 60) - 10;
    db.delete(rateLimitEntries).where(lt(rateLimitEntries.windowStart, rateLimitCutoff)).run();

    return NextResponse.json({ deleted: oldEmails.length, message: `${oldEmails.length} email lama dihapus` });
  } catch (err) {
    console.error("Cleanup error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
