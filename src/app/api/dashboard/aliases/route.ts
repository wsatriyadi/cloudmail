import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aliases, domains, rateLimitEntries, apiKeys } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { sessionUser } from "@/lib/authz";

const aliasSchema = z.object({
  localPart: z.string().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/, "Hanya huruf, angka, titik, underscore, dan dash"),
  domain: z.string().min(1),
  description: z.string().optional(),
  expiresInMinutes: z.number().nullable().optional(),
});

const CUSTOMER_ALIAS_RPM = 500;

function withinAliasLimit(apiKeyId: string): boolean {
  const window = Math.floor(Date.now() / 60000);
  db.run(sql`INSERT INTO rate_limit_entries (api_key_id, window_start, request_count)
    VALUES (${apiKeyId}, ${window}, 1)
    ON CONFLICT (api_key_id, window_start) DO UPDATE SET request_count = request_count + 1`);
  const result = db.select({ total: sql<number>`SUM(request_count)` })
    .from(rateLimitEntries)
    .where(and(eq(rateLimitEntries.apiKeyId, apiKeyId), gte(rateLimitEntries.windowStart, window)))
    .get();
  return (result?.total ?? 0) <= CUSTOMER_ALIAS_RPM;
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const rows = db.select({
    id: aliases.id,
    address: aliases.address,
    localPart: aliases.localPart,
    description: aliases.description,
    expiresAt: aliases.expiresAt,
    isActive: aliases.isActive,
    createdAt: aliases.createdAt,
    domainName: sql<string>`(SELECT domain FROM domains WHERE domains.id = ${aliases.domainId})`,
  }).from(aliases)
    .where(user.role === "admin" ? undefined : eq(aliases.createdById, user.id))
    .all();
  return NextResponse.json({ aliases: rows });
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  try {
    const parsed = aliasSchema.parse(await request.json());
    const domain = db.select().from(domains).where(and(eq(domains.domain, parsed.domain), eq(domains.isActive, true))).get();
    if (!domain) return NextResponse.json({ error: "Domain tidak ditemukan" }, { status: 404 });

    const address = `${parsed.localPart}@${parsed.domain}`.toLowerCase();
    if (db.select({ id: aliases.id }).from(aliases).where(eq(aliases.address, address)).get()) {
      return NextResponse.json({ error: "Alamat sudah digunakan" }, { status: 409 });
    }

    let ownerApiKeyId: string | null = null;
    if (user.role === "pelanggan") {
      const keys = db.select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.createdById, user.id), eq(apiKeys.isActive, true)))
        .all();
      const key = keys.find((candidate) => withinAliasLimit(candidate.id));
      if (!key) return NextResponse.json({ error: "Kuota alias habis (maksimum 500/menit) atau API key tidak aktif" }, { status: 429 });
      ownerApiKeyId = key.id;
    }

    const id = nanoid();
    const expiresAt = parsed.expiresInMinutes ? new Date(Date.now() + parsed.expiresInMinutes * 60000) : null;
    db.insert(aliases).values({
      id, address, localPart: parsed.localPart, domainId: domain.id,
      description: parsed.description || null, expiresAt,
      createdById: user.id, apiKeyId: ownerApiKeyId,
    }).run();
    return NextResponse.json({ id, address, expiresAt }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  try {
    const { id } = await request.json();
    if (typeof id !== "string" || !id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    const alias = db.select().from(aliases).where(eq(aliases.id, id)).get();
    if (!alias) return NextResponse.json({ error: "Alias tidak ditemukan" }, { status: 404 });
    if (user.role !== "admin" && alias.createdById !== user.id) return NextResponse.json({ error: "Tidak berhak menghapus alias ini" }, { status: 403 });
    db.delete(aliases).where(eq(aliases.id, id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
