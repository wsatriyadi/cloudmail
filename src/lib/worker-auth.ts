import crypto from "crypto";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function verifyWorkerSignature(
  body: string,
  timestamp: string | null,
  signature: string | null
): Promise<boolean> {
  if (!timestamp || !signature) return false;

  // Check timestamp freshness (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  // Get worker secret from settings
  const secretSetting = (await db
    .select()
    .from(settings)
    .where(eq(settings.key, "worker_secret")))[0];

  if (!secretSetting) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secretSetting.value)
    .update(body + timestamp)
    .digest("hex");

  // timingSafeEqual melempar error jika panjang buffer berbeda. Validasi
  // format hex 64 karakter lebih dulu agar signature rusak hanya -> false.
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;

  const actual = Buffer.from(signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  if (actual.length !== expected.length) return false;

  return crypto.timingSafeEqual(actual, expected);
}
