import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_RETENTION_DAYS = 30;

/**
 * Retensi email dibaca dari satu sumber (settings.email_retention_days) agar
 * dashboard, endpoint cleanup, dan cron memakai nilai yang sama.
 * 0 berarti email disimpan selamanya.
 */
export async function getRetentionDays(): Promise<number> {
  const row = (
    await db.select().from(settings).where(eq(settings.key, "email_retention_days"))
  )[0];

  if (!row?.value) return DEFAULT_RETENTION_DAYS;

  const days = Number.parseInt(row.value, 10);
  if (!Number.isFinite(days) || days < 0) return DEFAULT_RETENTION_DAYS;

  return days;
}

export function describeRetention(days: number): string {
  return days === 0 ? "selamanya" : `${days} hari`;
}
