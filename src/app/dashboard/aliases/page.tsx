import { db } from "@/lib/db";
import { aliases, domains } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { AliasTable } from "@/components/aliases/alias-table";

function getAliases() {
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
    .orderBy(desc(aliases.createdAt))
    .all();
}

function getDomains() {
  return db
    .select({ id: domains.id, domain: domains.domain })
    .from(domains)
    .all();
}

export default function AliasesPage() {
  const aliasList = getAliases();
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
