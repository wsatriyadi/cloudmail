import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aliases, domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

const aliasSchema = z.object({
  localPart: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Hanya huruf, angka, titik, underscore, dan dash"),
  domain: z.string().min(1),
  description: z.string().optional(),
  expiresInMinutes: z.number().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = aliasSchema.parse(body);

    const domain = db.select().from(domains).where(eq(domains.domain, parsed.domain)).get();
    if (!domain) {
      return NextResponse.json({ error: "Domain tidak ditemukan" }, { status: 404 });
    }

    const address = `${parsed.localPart}@${parsed.domain}`;
    const existing = db.select().from(aliases).where(eq(aliases.address, address)).get();
    if (existing) {
      return NextResponse.json({ error: "Alamat sudah digunakan" }, { status: 409 });
    }

    const id = nanoid();
    const expiresAt = parsed.expiresInMinutes
      ? new Date(Date.now() + parsed.expiresInMinutes * 60 * 1000)
      : null;

    db.insert(aliases)
      .values({ id, address, localPart: parsed.localPart, domainId: domain.id, description: parsed.description || null, expiresAt })
      .run();

    return NextResponse.json({ id, address, expiresAt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    db.delete(aliases).where(eq(aliases.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
