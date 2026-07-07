import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { compareSync, hashSync } from "bcryptjs";
import { sql } from "drizzle-orm";

// Save settings (single or bulk)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.bulk) {
      for (const [key, value] of Object.entries(body.bulk)) {
        db.run(
          sql`INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${value as string}, unixepoch())
              ON CONFLICT(key) DO UPDATE SET value = ${value as string}, updated_at = unixepoch()`
        );
      }
    } else if (body.key && body.value !== undefined) {
      db.run(
        sql`INSERT INTO settings (key, value, updated_at) VALUES (${body.key}, ${body.value}, unixepoch())
            ON CONFLICT(key) DO UPDATE SET value = ${body.value}, updated_at = unixepoch()`
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

    const user = db.select().from(users).where(eq(users.id, session.user.id)).get();

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    if (!compareSync(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
    }

    db.update(users)
      .set({
        passwordHash: hashSync(newPassword, 12),
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
