import { db } from "@/lib/db";
import { aliases, domains } from "@/lib/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import { requireUser } from "@/lib/authz";
import { AliasTable } from "@/components/aliases/alias-table";

function getAliases(userId: string | null) {
  return db
    .select({
      id: aliases.id,
      address: aliases.address,
      localPart: aliases.localPart,
      description: aliases.description,
      expiresAt: aliases.expiresAt,
      isActive: aliases.isActive,
      createdAt: aliases.createdAt,
      domainName: sql<string>`(SELECT domain FROM domains WHERE domains.id = ${aliases.domainId})`,
      emailCount: sql<number>`(SELECT COUNT(*) FROM emails WHERE emails.to_address = ${aliases.address})`,
    })
    .from(aliases)
    .where(userId ? eq(aliases.createdById, userId) : undefined)
    .orderBy(desc(aliases.createdAt))
    .all();
}

function getDomains() {
  return db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .all();
}

export default async function AliasesPage() {
  const user = await requireUser();
  const ownerId = user.role === "admin" ? null : user.id;
  const aliasList = getAliases(ownerId);
  const domainList = getDomains();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alias Email</h1>
        <p className="text-muted-foreground">
          Kelola alamat email kustom dan sementara.
        </p>
      </div>
      <AliasTable aliases={aliasList} domains={domainList} />
    </div>
  );
}
