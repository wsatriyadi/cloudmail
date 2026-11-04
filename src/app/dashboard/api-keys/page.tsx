import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/authz";
import { ApiKeyTable } from "@/components/api-keys/api-key-table";

function getApiKeys(createdById: string | null) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      permissions: apiKeys.permissions,
      rateLimit: apiKeys.rateLimit,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(createdById ? eq(apiKeys.createdById, createdById) : undefined)
    .orderBy(desc(apiKeys.createdAt))
    .all();
}

export default async function ApiKeysPage() {
  const user = await requireUser();
  // Pelanggan/viewer hanya melihat API key miliknya sendiri; admin melihat semua.
  const ownerId = user.role === "admin" ? null : user.id;
  const keys = getApiKeys(ownerId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kunci API</h1>
        <p className="text-muted-foreground">
          Kelola kunci API untuk akses programatis.
        </p>
      </div>
      <ApiKeyTable apiKeys={keys} />
    </div>
  );
}
