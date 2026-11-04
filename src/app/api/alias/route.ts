import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { aliases, domains } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { addressesOwnedByApiKey } from "@/lib/address-access";

const aliasSchema = z.object({
  localPart: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Hanya huruf, angka, titik, underscore, dan dash"),
  domain: z.string().min(1),
  description: z.string().optional(),
  expiresInMinutes: z.number().optional(),
});

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const parsed = aliasSchema.parse(await request.json());
    const domain = db.select().from(domains).where(eq(domains.domain, parsed.domain)).get();
    if (!domain?.isActive) {
      return NextResponse.json({ error: "Domain tidak ditemukan atau nonaktif" }, { status: 404 });
    }

    const address = `${parsed.localPart}@${parsed.domain}`.toLowerCase();
    if (db.select({ id: aliases.id }).from(aliases).where(eq(aliases.address, address)).get()) {
      return NextResponse.json({ error: "Alamat sudah digunakan" }, { status: 409 });
    }

    const id = nanoid();
    const expiresAt = parsed.expiresInMinutes
      ? new Date(Date.now() + parsed.expiresInMinutes * 60 * 1000)
      : null;

    // apiKeyId dicatat supaya alias bisa dikaitkan ke pemilik key (pelanggan).
    db.insert(aliases)
      .values({
        id,
        address,
        localPart: parsed.localPart,
        domainId: domain.id,
        description: parsed.description || null,
        expiresAt,
        apiKeyId: authResult.apiKey!.id,
      })
      .run();

    return NextResponse.json({ id, address, expiresAt: expiresAt?.toISOString() || null });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const owned = await addressesOwnedByApiKey(authResult.apiKey!.id);
  const rows = db.select().from(aliases).all();
  return NextResponse.json({ aliases: owned ? rows.filter((row) => owned.includes(row.address)) : rows });
}

export async function DELETE(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    const alias = db.select().from(aliases).where(eq(aliases.id, id)).get();
    if (!alias || alias.apiKeyId !== authResult.apiKey!.id) {
      return NextResponse.json({ error: "Alias tidak ditemukan" }, { status: 404 });
    }
    db.delete(aliases).where(eq(aliases.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
