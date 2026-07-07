import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth/config";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });

    const { name, rateLimit, permissions } = await request.json();
    if (!name) return NextResponse.json({ error: "Nama diperlukan" }, { status: 400 });

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
        rateLimit: rateLimit || 100,
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
    const { id, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    db.update(apiKeys).set({ isActive }).where(eq(apiKeys.id, id)).run();

    return NextResponse.json({ success: true });
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
