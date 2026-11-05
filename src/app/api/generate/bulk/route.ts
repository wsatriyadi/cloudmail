import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createIdentity } from "@/lib/identitas";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const perms = JSON.parse(authResult.apiKey!.permissions) as string[];
  if (!perms.includes("generate")) {
    return NextResponse.json({ error: "Kunci API tidak memiliki izin 'generate'" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const count = Math.min(parseInt(url.searchParams.get("count") || "5"), 20); // max 20

    const activeDomains = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(sql`${domains.isActive} = true`);

    if (activeDomains.length === 0) {
      return NextResponse.json({ error: "Tidak ada domain aktif" }, { status: 503 });
    }
    const owner = (await db.select({ createdById: apiKeys.createdById }).from(apiKeys).where(eq(apiKeys.id, authResult.apiKey!.id)))[0];

    const identities = [];

    for (let i = 0; i < count; i++) {
      try {
        identities.push(await createIdentity(activeDomains, authResult.apiKey!.id, owner?.createdById ?? null));
      } catch (err) {
        // Skip failed generations, continue with others
        console.error(`Generate ${i + 1} failed:`, err);
      }
    }

    return NextResponse.json({
      count: identities.length,
      identities,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal generate identitas" },
      { status: 500 }
    );
  }
}
