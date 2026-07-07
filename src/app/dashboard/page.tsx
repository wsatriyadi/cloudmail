import { db } from "@/lib/db";
import { emails, domains, apiKeys } from "@/lib/db/schema";
import { sql, eq, gte, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Globe, Key, Users, TrendingUp } from "lucide-react";
import { RecentEmails } from "@/components/dashboard/recent-emails";
import { ActivityChart } from "@/components/dashboard/activity-chart";

function getStats() {
  const totalEmails =
    db.select({ count: sql<number>`COUNT(*)` }).from(emails).get()?.count ?? 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const emailsToday =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(emails)
      .where(gte(emails.receivedAt, todayStart))
      .get()?.count ?? 0;

  const activeDomains =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(domains)
      .where(eq(domains.isActive, true))
      .get()?.count ?? 0;

  const uniqueAddresses =
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${emails.toAddress})` })
      .from(emails)
      .get()?.count ?? 0;

  const activeApiKeys =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(apiKeys)
      .where(eq(apiKeys.isActive, true))
      .get()?.count ?? 0;

  return { totalEmails, emailsToday, activeDomains, uniqueAddresses, activeApiKeys };
}

function getRecentEmails() {
  return db
    .select({
      id: emails.id,
      fromAddress: emails.fromAddress,
      fromName: emails.fromName,
      toAddress: emails.toAddress,
      subject: emails.subject,
      preview: emails.preview,
      receivedAt: emails.receivedAt,
      isRead: emails.isRead,
    })
    .from(emails)
    .orderBy(desc(emails.receivedAt))
    .limit(10)
    .all();
}

function getActivityData() {
  const days = 7;
  const data: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count =
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(emails)
        .where(
          sql`${emails.receivedAt} >= ${date} AND ${emails.receivedAt} < ${nextDate}`
        )
        .get()?.count ?? 0;

    data.push({
      date: date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      count,
    });
  }

  return data;
}

const statCards = [
  { label: "Total Email", icon: Mail, key: "totalEmails" as const },
  { label: "Email Hari Ini", icon: TrendingUp, key: "emailsToday" as const },
  { label: "Domain Aktif", icon: Globe, key: "activeDomains" as const },
  { label: "Alamat Unik", icon: Users, key: "uniqueAddresses" as const },
  { label: "Kunci API Aktif", icon: Key, key: "activeApiKeys" as const },
];

export default function DashboardPage() {
  const stats = getStats();
  const recentEmails = getRecentEmails();
  const activityData = getActivityData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Beranda</h1>
        <p className="text-muted-foreground">
          Ringkasan aktivitas platform email sementara Anda.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats[card.key].toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Activity Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Aktivitas Email</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={activityData} />
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Email Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentEmails emails={recentEmails} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
