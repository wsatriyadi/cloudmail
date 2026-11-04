import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { sessionUser } from "@/lib/authz";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "pelanggan", "viewer", "api-only"]),
});

export async function GET() {
  const session = await sessionUser();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  const rows = db.select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt })
    .from(users).orderBy(desc(users.createdAt)).all();
  return NextResponse.json({ users: rows });
}

export async function POST(request: Request) {
  const session = await sessionUser();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  try {
    const parsed = createUserSchema.parse(await request.json());
    if (db.select({ id: users.id }).from(users).where(eq(users.email, parsed.email)).get()) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }
    const id = nanoid();
    db.insert(users).values({ id, email: parsed.email, passwordHash: hashSync(parsed.password, 12), name: parsed.name, role: parsed.role }).run();
    return NextResponse.json({ id, email: parsed.email }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await sessionUser();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  try {
    const { id, role } = await request.json();
    if (typeof id !== "string" || !["admin", "pelanggan", "viewer", "api-only"].includes(role)) {
      return NextResponse.json({ error: "ID atau role tidak valid" }, { status: 400 });
    }
    db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await sessionUser();
  if (!session) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    const admins = db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).all();
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (target?.role === "admin" && admins.length <= 1) return NextResponse.json({ error: "Tidak bisa menghapus admin terakhir" }, { status: 400 });
    db.delete(users).where(eq(users.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
