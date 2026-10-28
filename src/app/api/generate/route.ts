import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createIdentity } from "@/lib/identitas";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  const authResult = await authenticateApiRequest(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Check permission
  const perms = JSON.parse(authResult.apiKey!.permissions) as string[];
  if (!perms.includes("generate")) {
    return NextResponse.json({ error: "Kunci API tidak memiliki izin 'generate'" }, { status: 403 });
  }

  try {
    const activeDomains = db
      .select({ id: domains.id, domain: domains.domain })
      .from(domains)
      .where(sql`${domains.isActive} = 1`)
      .all();

    if (activeDomains.length === 0) {
      return NextResponse.json({ error: "Tidak ada domain aktif" }, { status: 503 });
    }

    return NextResponse.json(await createIdentity(activeDomains, authResult.apiKey!.id));
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal generate identitas" },
      { status: 500 }
    );
  }
}
