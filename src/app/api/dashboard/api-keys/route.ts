import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { logAudit, getClientIP } from "@/lib/audit";
import { parseRateLimit, RATE_LIMIT_ERROR } from "@/lib/api-keys";
import { rateLimitCapFor, sessionUser } from "@/lib/authz";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await sessionUser();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

    const { name, rateLimit, permissions } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama diperlukan" }, { status: 400 });
    const parsedLimit = rateLimit === undefined ? null : parseRateLimit(rateLimit);
    const cap = rateLimitCapFor(session.role);
    if (rateLimit !== undefined && (parsedLimit === null || (cap !== null && parsedLimit > cap))) {
      return NextResponse.json({ error: cap ? `Maksimum ${cap} RPM untuk role pelanggan` : RATE_LIMIT_ERROR }, { status: 400 });
    }

    const rawKey = `tm_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 11);
    const id = nanoid();
    await db.insert(apiKeys)
      .values({
        id,
        name,
        keyHash,
        keyPrefix,
        permissions: JSON.stringify(permissions || ["generate", "inbox"]),
        rateLimit: parsedLimit ?? (cap ?? 100),
        createdById: session.id,
      });

    return NextResponse.json({ id, key: rawKey, prefix: keyPrefix });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await sessionUser();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    const { id, isActive, rateLimit } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    const before = (await db.select().from(apiKeys).where(eq(apiKeys.id, id)))[0];
    if (!before) return NextResponse.json({ error: "API key tidak ditemukan" }, { status: 404 });
    if (session.role !== "admin" && before.createdById !== session.id) {
      return NextResponse.json({ error: "Tidak berhak mengubah API key ini" }, { status: 403 });
    }

    const updates: Partial<typeof apiKeys.$inferInsert> = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (rateLimit !== undefined) {
      const parsed = parseRateLimit(rateLimit);
      const cap = rateLimitCapFor(session.role);
      if (parsed === null || (cap !== null && parsed > cap)) {
        return NextResponse.json({ error: cap ? `Maksimum ${cap} RPM untuk role pelanggan` : RATE_LIMIT_ERROR }, { status: 400 });
      }
      updates.rateLimit = parsed;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
    }
    await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id));
    if (updates.rateLimit !== undefined && updates.rateLimit !== before.rateLimit) {
      await logAudit({
        userId: session.id,
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
    const session = await sessionUser();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    const key = (await db.select().from(apiKeys).where(eq(apiKeys.id, id)))[0];
    if (!key) return NextResponse.json({ error: "API key tidak ditemukan" }, { status: 404 });
    if (session.role !== "admin" && key.createdById !== session.id) {
      return NextResponse.json({ error: "Tidak berhak menghapus API key ini" }, { status: 403 });
    }
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
