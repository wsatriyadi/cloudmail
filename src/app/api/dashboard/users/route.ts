import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashSync } from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "viewer", "api-only"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createUserSchema.parse(body);

    const existing = db.select().from(users).where(eq(users.email, parsed.email)).get();
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const id = nanoid();
    db.insert(users)
      .values({ id, email: parsed.email, passwordHash: hashSync(parsed.password, 12), name: parsed.name, role: parsed.role })
      .run();

    return NextResponse.json({ id, email: parsed.email });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, role } = await request.json();
    if (!id || !role) return NextResponse.json({ error: "ID dan role diperlukan" }, { status: 400 });
    db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const admins = db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).all();
    const targetUser = db.select().from(users).where(eq(users.id, id)).get();

    if (targetUser?.role === "admin" && admins.length <= 1) {
      return NextResponse.json({ error: "Tidak bisa menghapus admin terakhir" }, { status: 400 });
    }

    db.delete(users).where(eq(users.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
