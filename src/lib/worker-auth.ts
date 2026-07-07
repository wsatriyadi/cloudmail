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
  const secretSetting = db
    .select()
    .from(settings)
    .where(eq(settings.key, "worker_secret"))
    .get();

  if (!secretSetting) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secretSetting.value)
    .update(body + timestamp)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSignature, "hex")
  );
}
