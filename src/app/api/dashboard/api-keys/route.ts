import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth/config";
import { logAudit, getClientIP } from "@/lib/audit";
import { parseRateLimit, RATE_LIMIT_ERROR } from "@/lib/api-keys";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

    const { name, rateLimit, permissions } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama diperlukan" }, { status: 400 });
    if (rateLimit !== undefined && parseRateLimit(rateLimit) === null) {
      return NextResponse.json({ error: RATE_LIMIT_ERROR }, { status: 400 });
    }
    // Generate key: tm_ + 48 hex chars
    const rawKey = `tm_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 11); // "tm_" + 8 chars

    const id = nanoid();
    db.insert(apiKeys)
      .values({
        id,
        name,
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(permissions || ["generate", "inbox"]),
        rateLimit: parseRateLimit(rateLimit) ?? 100,

        createdById: session.user.id,
      })
      .run();

    return NextResponse.json({ id, key: rawKey, prefix: keyPrefix });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

    const { id, isActive, rateLimit } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const updates: Partial<typeof apiKeys.$inferInsert> = {};

    if (isActive !== undefined) updates.isActive = isActive;

    if (rateLimit !== undefined) {
      const parsed = parseRateLimit(rateLimit);
      if (parsed === null) return NextResponse.json({ error: RATE_LIMIT_ERROR }, { status: 400 });
      updates.rateLimit = parsed;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }

    const before = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
    if (!before) return NextResponse.json({ error: "API key tidak ditemukan" }, { status: 404 });

    db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).run();

    if (updates.rateLimit !== undefined && updates.rateLimit !== before.rateLimit) {
      logAudit({
        userId: session.user.id,
        action: "update_api_key",
        resource: `api_key:${id}`,
        details: { name: before.name, rateLimit: { from: before.rateLimit, to: updates.rateLimit } },
        ipAddress: getClientIP(request),
      });
    }

    return NextResponse.json({ success: true, rateLimit: updates.rateLimit });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    db.delete(apiKeys).where(eq(apiKeys.id, id)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
