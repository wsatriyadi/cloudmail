import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { sessionUser } from "@/lib/authz";

const domainSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Format domain tidak valid"),
  description: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

async function requireAdminResponse() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Akses admin diperlukan" }, { status: 403 });
  return null;
}

export async function POST(request: Request) {
  const denied = await requireAdminResponse();
  if (denied) return denied;
  try {
    const body = await request.json();
    const parsed = domainSchema.parse(body);

    const existing = db.select().from(domains).where(eq(domains.domain, parsed.domain)).get();
    if (existing) {
      return NextResponse.json({ error: "Domain sudah terdaftar" }, { status: 409 });
    }

    const id = nanoid();
    db.insert(domains)
      .values({
        id,
        domain: parsed.domain,
        description: parsed.description || null,
        isActive: parsed.isActive,
      })
      .run();

    return NextResponse.json({ id, domain: parsed.domain });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdminResponse();
  if (denied) return denied;
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const parsed = domainSchema.parse(data);

    const existing = db.select().from(domains).where(eq(domains.domain, parsed.domain)).get();
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Domain sudah digunakan" }, { status: 409 });
    }

    db.update(domains)
      .set({
        domain: parsed.domain,
        description: parsed.description || null,
        isActive: parsed.isActive,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdminResponse();
  if (denied) return denied;
  try {
    const { id, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    db.update(domains)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(domains.id, id))
      .run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdminResponse();
  if (denied) return denied;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    db.delete(domains).where(eq(domains.id, id)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
