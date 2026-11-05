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

async function withinAliasLimit(apiKeyId: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60000);
  await db.execute(sql`INSERT INTO rate_limit_entries (api_key_id, window_start, request_count)
    VALUES (${apiKeyId}, ${window}, 1)
    ON CONFLICT (api_key_id, window_start) DO UPDATE SET request_count = rate_limit_entries.request_count + 1`);
  const result = (await db.select({ total: sql<number>`COALESCE(SUM(request_count), 0)` })
    .from(rateLimitEntries)
    .where(and(eq(rateLimitEntries.apiKeyId, apiKeyId), gte(rateLimitEntries.windowStart, window))))[0];
  return Number(result?.total ?? 0) <= CUSTOMER_ALIAS_RPM;
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  const rows = await db.select({
    id: aliases.id,
    address: aliases.address,
    localPart: aliases.localPart,
    description: aliases.description,
    expiresAt: aliases.expiresAt,
    isActive: aliases.isActive,
    createdAt: aliases.createdAt,
    domainName: sql<string>`(SELECT domain FROM domains WHERE domains.id = ${aliases.domainId})`,
  }).from(aliases)
    .where(user.role === "admin" ? undefined : eq(aliases.createdById, user.id));
  return NextResponse.json({ aliases: rows });
}

export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  try {
    const parsed = aliasSchema.parse(await request.json());
    const domain = (await db.select().from(domains).where(and(eq(domains.domain, parsed.domain), eq(domains.isActive, true))))[0];
    if (!domain) return NextResponse.json({ error: "Domain tidak ditemukan" }, { status: 404 });

    const address = `${parsed.localPart}@${parsed.domain}`.toLowerCase();
    if ((await db.select({ id: aliases.id }).from(aliases).where(eq(aliases.address, address)))[0]) {
      return NextResponse.json({ error: "Alamat sudah digunakan" }, { status: 409 });
    }

    let ownerApiKeyId: string | null = null;
    if (user.role === "pelanggan") {
      const keys = await db.select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.createdById, user.id), eq(apiKeys.isActive, true)));
      let key: { id: string } | undefined;
      for (const candidate of keys) {
        if (await withinAliasLimit(candidate.id)) { key = candidate; break; }
      }
      if (!key) return NextResponse.json({ error: "Kuota alias habis (maksimum 500/menit) atau API key tidak aktif" }, { status: 429 });
      ownerApiKeyId = key.id;
    }

    const id = nanoid();
    const expiresAt = parsed.expiresInMinutes ? new Date(Date.now() + parsed.expiresInMinutes * 60000) : null;
    await db.insert(aliases).values({
      id, address, localPart: parsed.localPart, domainId: domain.id,
      description: parsed.description || null, expiresAt,
      createdById: user.id, apiKeyId: ownerApiKeyId,
    });
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
    const alias = (await db.select().from(aliases).where(eq(aliases.id, id)))[0];
    if (!alias) return NextResponse.json({ error: "Alias tidak ditemukan" }, { status: 404 });
    if (user.role !== "admin" && alias.createdById !== user.id) return NextResponse.json({ error: "Tidak berhak menghapus alias ini" }, { status: 403 });
    await db.delete(aliases).where(eq(aliases.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
