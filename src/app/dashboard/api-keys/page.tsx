import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ApiKeyTable } from "@/components/api-keys/api-key-table";

function getApiKeys() {
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
    .orderBy(desc(apiKeys.createdAt))
    .all();
}

export default function ApiKeysPage() {
  const keys = getApiKeys();

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
