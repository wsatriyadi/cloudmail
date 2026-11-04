import { NextResponse } from "next/server";
import { createIdentity } from "@/lib/identitas";
import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { requireUser } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

// Generate identitas dari dashboard. Semua role boleh memakainya; identitas
// dicatat atas nama user yang login (bukan API key).
export async function POST() {
  const user = await requireUser();

  const activeDomains = db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .where(sql`${domains.isActive} = 1`)
    .all();

  if (activeDomains.length === 0) {
    return NextResponse.json({ error: "Tidak ada domain aktif" }, { status: 503 });
  }

  try {
    const identity = await createIdentity(activeDomains, null, user.id);
    logAudit({ userId: user.id, action: "generate_identity", resource: `identity:${identity.email}` });
    return NextResponse.json(identity);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal generate identitas" },
      { status: 500 }
    );
  }
}
