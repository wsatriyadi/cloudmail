import { db } from "@/lib/db";
import { domains, emails } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { DomainTable } from "@/components/domains/domain-table";

function getDomains() {
  const allDomains = db
    .select({
      id: domains.id,
      domain: domains.domain,
      isActive: domains.isActive,
      description: domains.description,
      createdAt: domains.createdAt,
      emailCount: sql<number>`(SELECT COUNT(*) FROM emails WHERE emails.domain_id = ${domains.id})`,
    })
    .from(domains)
    .orderBy(desc(domains.createdAt))
    .all();

  return allDomains;
}

export default function DomainsPage() {
  const domainList = getDomains();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Domain</h1>
        <p className="text-muted-foreground">
          Kelola domain untuk menerima email sementara.
        </p>
      </div>
      <DomainTable domains={domainList} />
    </div>
  );
}
