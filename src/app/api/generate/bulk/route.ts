import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createIdentity } from "@/lib/identitas";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { apiKeyOwner, usableDomainFilter } from "@/lib/domain-access";

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

    const owner = await apiKeyOwner(authResult.apiKey!.id);
    const activeDomains = await db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(usableDomainFilter(owner?.role ?? "api-only", owner?.id ?? null));

    if (activeDomains.length === 0) {
      return NextResponse.json({ error: "Tidak ada domain aktif" }, { status: 503 });
    }

    const identities = [];

    for (let i = 0; i < count; i++) {
      try {
        identities.push(await createIdentity(activeDomains, authResult.apiKey!.id, owner?.id ?? null));
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
