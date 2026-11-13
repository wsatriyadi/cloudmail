import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { sessionUser } from "@/lib/authz";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/audit-log?page=1&limit=50
 * Admin melihat semua log; pengguna lain hanya log miliknya.
 */
export async function GET(request: Request) {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit")) || 50)
  );
  const offset = (page - 1) * limit;

  const where = user.role === "admin" ? undefined : eq(auditLogs.userId, user.id);

  const total = Number(
    (await db.select({ count: count() }).from(auditLogs).where(where))[0]?.count ?? 0
  );

  const logs = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      resource: auditLogs.resource,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
