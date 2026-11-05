import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { sessionUser } from "@/lib/authz";
import { compareSync, hashSync } from "bcryptjs";
import { sql } from "drizzle-orm";

// Save settings (single or bulk)
export async function POST(request: Request) {
  try {
    const session = await sessionUser();
    if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    if (session.role !== "admin") return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
    const body = await request.json();

    if (body.bulk) {
      for (const [key, value] of Object.entries(body.bulk)) {
        await db.execute(
          sql`INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${value as string}, now())
              ON CONFLICT(key) DO UPDATE SET value = ${value as string}, updated_at = now()`
        );
      }
    } else if (body.key && body.value !== undefined) {
      await db.execute(
        sql`INSERT INTO settings (key, value, updated_at) VALUES (${body.key}, ${body.value}, now())
            ON CONFLICT(key) DO UPDATE SET value = ${body.value}, updated_at = now()`
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

// Change password
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    const user = (await db.select().from(users).where(eq(users.id, session.user.id)))[0];

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (!compareSync(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
    }

    await db.update(users)
      .set({
        passwordHash: hashSync(newPassword, 12),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
