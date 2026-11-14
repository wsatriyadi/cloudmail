import { db } from "@/lib/db";
import { apiKeys, rateLimitEntries, users } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import { normaliseRole, rateLimitCapFor } from "@/lib/roles";

export interface AuthResult {
  error?: string;
  status?: number;
  apiKey?: typeof apiKeys.$inferSelect;
}

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export async function authenticateApiRequest(
  request: Request
): Promise<AuthResult> {
  // Header utama: Authorization: Bearer <key>. x-api-key tetap diterima
  // untuk kompatibilitas integrasi lama (MCP/docs versi sebelumnya).
  const authHeader = request.headers.get("Authorization");
  const legacyHeader = request.headers.get("x-api-key");

  const key = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : legacyHeader?.trim();

  if (!key) {
    return { error: "API key diperlukan. Gunakan header: Authorization: Bearer <key>", status: 401 };
  }

  const keyHash = sha256(key);

  const apiKey = (await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true))))[0];

  if (!apiKey) {
    return { error: "API key tidak valid", status: 401 };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { error: "API key sudah kedaluwarsa", status: 401 };
  }

  // Check IP allowlist
  if (apiKey.ipAllowlist) {
    const allowedIPs = JSON.parse(apiKey.ipAllowlist) as string[];
    if (allowedIPs.length > 0) {
      const clientIP =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      if (!allowedIPs.includes(clientIP)) {
        return { error: "IP tidak diizinkan", status: 403 };
      }
    }
  }

  // Batas role berlaku sebagai akumulasi semua API key milik pemilik key
  // (pelanggan: 1000 RPM total, bukan 1000 per key).
  const owner = (await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, apiKey.createdById)))[0];
  const userCap = owner ? rateLimitCapFor(normaliseRole(owner.role)) : null;

  const limit = await checkRateLimit(apiKey, userCap);
  if (!limit.allowed) {
    return {
      error:
        limit.scope === "user"
          ? `Rate limit akun terlampaui: maksimum ${userCap} permintaan/menit total untuk semua API key. Coba lagi nanti.`
          : "Rate limit terlampaui. Coba lagi nanti.",
      status: 429,
    };
  }

  // Update last used
  await db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return { apiKey };
}

async function checkRateLimit(
  apiKey: typeof apiKeys.$inferSelect,
  userCap: number | null
): Promise<{ allowed: boolean; scope: "key" | "user" }> {
  const now = Math.floor(Date.now() / 1000);
  const currentWindow = Math.floor(now / 60);

  await db.execute(
    sql`INSERT INTO rate_limit_entries (api_key_id, window_start, request_count)
        VALUES (${apiKey.id}, ${currentWindow}, 1)
        ON CONFLICT (api_key_id, window_start)
        DO UPDATE SET request_count = rate_limit_entries.request_count + 1`
  );

  const keyResult = (await db
    .select({
      total: sql<number>`COALESCE(SUM(request_count), 0)`,
    })
    .from(rateLimitEntries)
    .where(
      and(
        eq(rateLimitEntries.apiKeyId, apiKey.id),
        gte(rateLimitEntries.windowStart, currentWindow - 1)
      )
    ))[0];

  if (Number(keyResult?.total ?? 0) > apiKey.rateLimit) {
    return { allowed: false, scope: "key" };
  }

  if (userCap === null) return { allowed: true, scope: "key" };

  const userResult = (await db
    .select({
      total: sql<number>`COALESCE(SUM(${rateLimitEntries.requestCount}), 0)`,
    })
    .from(rateLimitEntries)
    .innerJoin(apiKeys, eq(apiKeys.id, rateLimitEntries.apiKeyId))
    .where(
      and(
        eq(apiKeys.createdById, apiKey.createdById),
        gte(rateLimitEntries.windowStart, currentWindow - 1)
      )
    ))[0];

  if (Number(userResult?.total ?? 0) > userCap) {
    return { allowed: false, scope: "user" };
  }

  return { allowed: true, scope: "user" };
}

export async function cleanupRateLimits() {
  const cutoff = Math.floor(Date.now() / 1000 / 60) - 10;
  await db.delete(rateLimitEntries)
    .where(sql`${rateLimitEntries.windowStart} < ${cutoff}`);
}
