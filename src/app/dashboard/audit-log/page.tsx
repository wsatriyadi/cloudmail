import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { AuditLogTable } from "@/components/audit/audit-log-table";

function getAuditLogs() {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      resource: auditLogs.resource,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      userName: sql<string>`(SELECT name FROM users WHERE users.id = ${auditLogs.userId})`,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(200)
    .all();
}

export default function AuditLogPage() {
  const logs = getAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Log Aktivitas</h1>
        <p className="text-muted-foreground">
          Riwayat semua aktivitas pada platform.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  );
}
