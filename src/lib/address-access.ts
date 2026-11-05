import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aliases, apiKeys, emails, identitas, users } from "@/lib/db/schema";

// Addresses owned by user directly or through their API keys.
export async function addressesOwnedBy(userId: string): Promise<string[]> {
  const keyIds = (await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(eq(apiKeys.createdById, userId)))
    .map((key) => key.id);

  const ownAliases = (await db
    .select({ address: aliases.address })
    .from(aliases)
    .where(eq(aliases.createdById, userId)))
    .map((row) => row.address);
  const keyAliases = keyIds.length
    ? (await db.select({ address: aliases.address }).from(aliases).where(inArray(aliases.apiKeyId, keyIds))).map((row) => row.address)
    : [];
  const keyIdentities = keyIds.length
    ? (await db.select({ address: identitas.address }).from(identitas).where(inArray(identitas.apiKeyId, keyIds))).map((row) => row.address)
    : [];
  const dashboardIdentities = (await db
    .select({ address: identitas.address })
    .from(identitas)
    .where(eq(identitas.userId, userId)))
    .map((row) => row.address);

  return [...new Set([...ownAliases, ...keyAliases, ...keyIdentities, ...dashboardIdentities])];
}

// null means unrestricted admin access.
export async function emailScopeFor(userId: string, role: string): Promise<string[] | null> {
  if (role === "admin") return null;
  return addressesOwnedBy(userId);
}

// SQL subquery avoids SQLite's bind-variable limit when a customer owns many addresses.
export function emailScopeCondition(userId: string, role: string) {
  if (role === "admin") return undefined;
  return sql`${emails.toAddress} IN (
    SELECT address FROM aliases WHERE created_by_id = ${userId}
    UNION SELECT address FROM aliases WHERE api_key_id IN (SELECT id FROM api_keys WHERE created_by_id = ${userId})
    UNION SELECT address FROM identitas WHERE user_id = ${userId}
    UNION SELECT address FROM identitas WHERE api_key_id IN (SELECT id FROM api_keys WHERE created_by_id = ${userId})
  )`;
}

// null means API key owner is not a customer and retains unrestricted API access.
export async function addressesOwnedByApiKey(apiKeyId: string): Promise<string[] | null> {
  const owner = (await db
    .select({ id: users.id, role: users.role })
    .from(apiKeys)
    .leftJoin(users, eq(users.id, apiKeys.createdById))
    .where(eq(apiKeys.id, apiKeyId)))[0];

  if (!owner?.id || owner.role !== "pelanggan") return null;
  return addressesOwnedBy(owner.id);
}
