import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys, domains, emails, users } from "@/lib/db/schema";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { sessionUser } from "@/lib/authz";
import { emailScopeCondition } from "@/lib/address-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stats
 * Statistik untuk aplikasi mobile. Pelanggan hanya melihat data miliknya.
 */
export async function GET() {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terotorisasi" }, { status: 401 });
  }

  const isAdmin = user.role === "admin";
  const scope = emailScopeCondition(user.id, user.role);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalEmails = Number(
    (await db.select({ count: count() }).from(emails).where(scope))[0]?.count ?? 0
  );

  const todayEmails = Number(
    (
      await db
        .select({ count: count() })
        .from(emails)
        .where(and(scope, gte(emails.receivedAt, todayStart)))
    )[0]?.count ?? 0
  );

  const totalDomains = isAdmin
    ? Number((await db.select({ count: count() }).from(domains))[0]?.count ?? 0)
    : Number(
        (
          await db
            .select({ count: sql<number>`COUNT(DISTINCT ${emails.domainId})` })
            .from(emails)
            .where(scope)
        )[0]?.count ?? 0
      );

  const activeDomains = isAdmin
    ? Number(
        (
          await db
            .select({ count: count() })
            .from(domains)
            .where(eq(domains.isActive, true))
        )[0]?.count ?? 0
      )
    : Number(
        (
          await db
            .select({ count: sql<number>`COUNT(DISTINCT ${emails.domainId})` })
            .from(emails)
            .leftJoin(domains, eq(domains.id, emails.domainId))
            .where(and(scope, eq(domains.isActive, true)))
        )[0]?.count ?? 0
      );

  const keyScope = isAdmin ? undefined : eq(apiKeys.createdById, user.id);
  const totalApiKeys = Number(
    (await db.select({ count: count() }).from(apiKeys).where(keyScope))[0]?.count ?? 0
  );
  const activeApiKeys = Number(
    (
      await db
        .select({ count: count() })
        .from(apiKeys)
        .where(and(keyScope, eq(apiKeys.isActive, true)))
    )[0]?.count ?? 0
  );

  const totalUsers = isAdmin
    ? Number((await db.select({ count: count() }).from(users))[0]?.count ?? 0)
    : 1;

  const activityData: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const dayCount = Number(
      (
        await db
          .select({ count: count() })
          .from(emails)
          .where(and(scope, gte(emails.receivedAt, start), sql`${emails.receivedAt} < ${end.toISOString()}`))
      )[0]?.count ?? 0
    );

    activityData.push({
      date: start.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      count: dayCount,
    });
  }

  return NextResponse.json({
    totalEmails,
    totalDomains,
    totalApiKeys,
    totalUsers,
    todayEmails,
    activeDomains,
    activeApiKeys,
    activityData,
  });
}
