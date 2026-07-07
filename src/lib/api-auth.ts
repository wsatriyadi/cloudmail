import { db } from "@/lib/db";
import { apiKeys, rateLimitEntries } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import crypto from "crypto";

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
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "API key diperlukan. Gunakan header: Authorization: Bearer <key>", status: 401 };
  }

  const key = authHeader.slice(7);
  const keyHash = sha256(key);

  const apiKey = db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
    .get();

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

  // Check rate limit
  const allowed = checkRateLimit(apiKey.id, apiKey.rateLimit);
  if (!allowed) {
    return { error: "Rate limit terlampaui. Coba lagi nanti.", status: 429 };
  }

  // Update last used
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .run();

  return { apiKey };
}

function checkRateLimit(apiKeyId: string, limit: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const currentWindow = Math.floor(now / 60);

  db.run(
    sql`INSERT INTO rate_limit_entries (api_key_id, window_start, request_count)
        VALUES (${apiKeyId}, ${currentWindow}, 1)
        ON CONFLICT (api_key_id, window_start)
        DO UPDATE SET request_count = request_count + 1`
  );

  const result = db
    .select({
      total: sql<number>`COALESCE(SUM(request_count), 0)`,
    })
    .from(rateLimitEntries)
    .where(
      and(
        eq(rateLimitEntries.apiKeyId, apiKeyId),
        gte(rateLimitEntries.windowStart, currentWindow - 1)
      )
    )
    .get();

  return (result?.total ?? 0) <= limit;
}

export function cleanupRateLimits() {
  const cutoff = Math.floor(Date.now() / 1000 / 60) - 10;
  db.delete(rateLimitEntries)
    .where(sql`${rateLimitEntries.windowStart} < ${cutoff}`)
    .run();
}
