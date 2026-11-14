import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, domains, users } from "@/lib/db/schema";
import { normaliseRole, type Role } from "@/lib/roles";

// Domain hanya boleh dipakai setelah aktif DAN disetujui admin.
export function approvedDomainFilter() {
  return sql`${domains.isActive} = true AND ${domains.status} = 'approved'`;
}

// Domain platform (created_by_id NULL) dipakai bersama. Domain milik pelanggan
// hanya bisa dipakai pemiliknya; admin bebas memakai semua domain approved.
export function usableDomainFilter(role: string, userId: string | null) {
  const normalised = normaliseRole(role);
  if (normalised === "admin" || !userId) return approvedDomainFilter();
  if (normalised === "pelanggan") {
    return sql`${domains.isActive} = true AND ${domains.status} = 'approved' AND (${domains.createdById} IS NULL OR ${domains.createdById} = ${userId})`;
  }
  return approvedDomainFilter();
}

// Pemilik API key menentukan domain mana yang boleh dipakai key tersebut.
export async function apiKeyOwner(apiKeyId: string): Promise<{ id: string; role: Role } | null> {
  const row = (await db
    .select({ id: users.id, role: users.role })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.createdById))
    .where(eq(apiKeys.id, apiKeyId)))[0];
  return row ? { id: row.id, role: normaliseRole(row.role) } : null;
}
