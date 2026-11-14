import { db } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { DomainTable } from "@/components/domains/domain-table";
import { requireMenuAccess } from "@/lib/authz";

async function getDomains(ownerId: string | null) {
  return db
    .select({
      id: domains.id,
      domain: domains.domain,
      isActive: domains.isActive,
      status: domains.status,
      description: domains.description,
      createdAt: domains.createdAt,
      ownerEmail: sql<string | null>`(SELECT email FROM users WHERE users.id = ${domains.createdById})`,
      emailCount: sql<number>`(SELECT COUNT(*) FROM emails WHERE emails.domain_id = ${domains.id})`,
    })
    .from(domains)
    .where(ownerId ? eq(domains.createdById, ownerId) : undefined)
    .orderBy(desc(domains.createdAt));
}

export default async function DomainsPage() {
  const user = await requireMenuAccess("/dashboard/domains");
  // Pelanggan hanya melihat domain yang ia tambahkan; admin melihat semua.
  const domainList = await getDomains(user.role === "admin" ? null : user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Domain</h1>
        <p className="text-muted-foreground">
          {user.role === "admin"
            ? "Kelola domain dan setujui permintaan domain dari pelanggan."
            : "Tambahkan domain Anda. Domain baru bisa dipakai setelah disetujui admin."}
        </p>
      </div>
      <DomainTable domains={domainList} role={user.role} />
    </div>
  );
}
