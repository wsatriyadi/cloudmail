import { db } from "@/lib/db";
import { emails, domains, apiKeys, aliases } from "@/lib/db/schema";
import { sql, desc, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Globe, Key, Users, TrendingUp, ArrowUpRight, AtSign, Activity, Plus, Settings, Eye } from "lucide-react";
import { RecentEmails } from "@/components/dashboard/recent-emails";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import Link from "next/link";

function getStats() {
  const totalEmails =
    db.select({ count: sql<number>`COUNT(*)` }).from(emails).get()?.count ?? 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEpoch = Math.floor(todayStart.getTime() / 1000);
  const emailsToday =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(emails)
      .where(sql`${emails.receivedAt} >= ${todayEpoch}`)
      .get()?.count ?? 0;

  // Yesterday's emails for trend calculation
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEpoch = Math.floor(yesterdayStart.getTime() / 1000);
  const emailsYesterday =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(emails)
      .where(sql`${emails.receivedAt} >= ${yesterdayEpoch} AND ${emails.receivedAt} < ${todayEpoch}`)
      .get()?.count ?? 0;

  const activeDomains =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(domains)
      .where(sql`${domains.isActive} = 1`)
      .get()?.count ?? 0;

  const totalDomains =
    db.select({ count: sql<number>`COUNT(*)` }).from(domains).get()?.count ?? 0;

  const uniqueAddresses =
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${emails.toAddress})` })
      .from(emails)
      .get()?.count ?? 0;

  const activeApiKeys =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(apiKeys)
      .where(sql`${apiKeys.isActive} = 1`)
      .get()?.count ?? 0;

  const totalAliases =
    db.select({ count: sql<number>`COUNT(*)` }).from(aliases).get()?.count ?? 0;

  const unreadCount =
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(emails)
      .where(sql`${emails.isRead} = 0`)
      .get()?.count ?? 0;

  // Calculate trend percentage
  const trendPercentage = emailsYesterday > 0 
    ? Math.round(((emailsToday - emailsYesterday) / emailsYesterday) * 100)
    : emailsToday > 0 ? 100 : 0;

  return { 
    totalEmails, 
    emailsToday, 
    activeDomains, 
    totalDomains,
    uniqueAddresses, 
    activeApiKeys,
    totalAliases,
    unreadCount,
    trendPercentage,
    emailsYesterday
  };
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

    const startEpoch = Math.floor(date.getTime() / 1000);
    const endEpoch = Math.floor(nextDate.getTime() / 1000);

    const count =
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(emails)
        .where(
          sql`${emails.receivedAt} >= ${startEpoch} AND ${emails.receivedAt} < ${endEpoch}`
        )
        .get()?.count ?? 0;

    data.push({
      date: date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }),
      count,
    });
  }

  return data;
}

export default function DashboardPage() {
  const stats = getStats();
  const recentEmails = getRecentEmails();
  const activityData = getActivityData();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Beranda</h1>
          <p className="text-muted-foreground">
            Ringkasan aktivitas platform email sementara Anda
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/inbox">
              <Eye className="mr-2 h-4 w-4" />
              Lihat Inbox
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/aliases">
              <Plus className="mr-2 h-4 w-4" />
              Buat Alias
            </Link>
          </Button>
        </div>
      </div>

      {/* Primary Stats - Featured */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Email Today - Featured */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Hari Ini</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.emailsToday.toLocaleString("id-ID")}</div>
            <div className="flex items-center gap-2 mt-2">
              {stats.trendPercentage !== 0 && (
                <Badge variant={stats.trendPercentage > 0 ? "default" : "secondary"} className="text-xs">
                  {stats.trendPercentage > 0 ? "+" : ""}{stats.trendPercentage}%
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                {stats.emailsYesterday} email kemarin
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Emails */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Email</CardTitle>
            <Mail className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEmails.toLocaleString("id-ID")}</div>
            {stats.unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {stats.unreadCount} belum dibaca
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Domains */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domain Aktif</CardTitle>
            <Globe className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeDomains.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-2">
              dari {stats.totalDomains} total domain
            </p>
          </CardContent>
        </Card>

        {/* Unique Addresses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alamat Unik</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.uniqueAddresses.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalAliases} alias dibuat
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aksi Cepat</CardTitle>
          <CardDescription>Pintasan ke fitur yang sering digunakan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto flex-col items-start p-4 text-left">
              <Link href="/dashboard/aliases">
                <div className="flex w-full items-center justify-between">
                  <AtSign className="h-5 w-5 text-muted-foreground" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Buat Alias</div>
                  <div className="text-xs text-muted-foreground">Email kustom baru</div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col items-start p-4 text-left">
              <Link href="/dashboard/domains">
                <div className="flex w-full items-center justify-between">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Kelola Domain</div>
                  <div className="text-xs text-muted-foreground">Tambah atau edit domain</div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col items-start p-4 text-left">
              <Link href="/dashboard/api-keys">
                <div className="flex w-full items-center justify-between">
                  <Key className="h-5 w-5 text-muted-foreground" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Kunci API</div>
                  <div className="text-xs text-muted-foreground">
                    {stats.activeApiKeys} aktif
                  </div>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto flex-col items-start p-4 text-left">
              <Link href="/dashboard/settings">
                <div className="flex w-full items-center justify-between">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Pengaturan</div>
                  <div className="text-xs text-muted-foreground">Konfigurasi sistem</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Activity Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Aktivitas Email (7 Hari Terakhir)
            </CardTitle>
            <CardDescription>
              Grafik penerimaan email dalam seminggu terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={activityData} />
          </CardContent>
        </Card>

        {/* Recent Emails */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Terbaru
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/inbox" className="text-xs">
                  Lihat Semua
                  <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <CardDescription>10 email terakhir yang diterima</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            <RecentEmails emails={recentEmails} />
          </CardContent>
        </Card>
      </div>

      {/* System Info Footer */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-2 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span>Sistem berjalan normal</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Retensi email: 90 hari</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              SQLite
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stats.totalEmails.toLocaleString("id-ID")} records
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
