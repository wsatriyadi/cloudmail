import { db } from "@/lib/db";
import { attachments, emails, rateLimitEntries } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import { getRetentionDays } from "@/lib/retention";

export interface CleanupResult {
  deleted: number;
  retentionDays: number;
  cutoffDate: string | null;
  message: string;
}

/**
 * Satu implementasi cleanup untuk semua endpoint cron. Menghapus file
 * attachment lebih dulu, lalu baris email (body & attachment ikut cascade),
 * lalu membersihkan rate limit lama.
 */
export async function runEmailCleanup(): Promise<CleanupResult> {
  const retentionDays = await getRetentionDays();

  if (retentionDays === 0) {
    return {
      deleted: 0,
      retentionDays,
      cutoffDate: null,
      message: "Retensi diatur ke selamanya",
    };
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const oldEmails = await db
    .select({ id: emails.id })
    .from(emails)
    .where(lt(emails.receivedAt, cutoff));

  for (const email of oldEmails) {
    const atts = await db
      .select({ storagePath: attachments.storagePath })
      .from(attachments)
      .where(eq(attachments.emailId, email.id));

    for (const att of atts) {
      const filePath = path.join(process.cwd(), "data/uploads", att.storagePath);
      await fs.unlink(filePath).catch(() => {});
    }
  }

  if (oldEmails.length > 0) {
    await db.delete(emails).where(lt(emails.receivedAt, cutoff));
  }

  const rateLimitCutoff = Math.floor(Date.now() / 1000 / 60) - 10;
  await db
    .delete(rateLimitEntries)
    .where(lt(rateLimitEntries.windowStart, rateLimitCutoff));

  return {
    deleted: oldEmails.length,
    retentionDays,
    cutoffDate: cutoff.toISOString(),
    message: `${oldEmails.length} email lebih lama dari ${retentionDays} hari dihapus`,
  };
}
