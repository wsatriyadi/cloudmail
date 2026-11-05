import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { logAudit, getClientIP } from "@/lib/audit";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Backup berupa JSON dump dari managed Postgres; file .db tidak berlaku lagi.
const TABLES = [
  "users", "domains", "emails", "email_bodies", "attachments", "api_keys",
  "rate_limit_entries", "aliases", "audit_logs", "settings",
  "nama_depan", "nama_belakang", "identitas",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  try {
    const dump: Record<string, unknown> = {};
    for (const table of TABLES) {
      dump[table] = await db.execute(sql.raw(`SELECT * FROM ${table}`));
    }

    await logAudit({
      userId: session.user.id,
      action: "backup_download",
      ipAddress: getClientIP(request),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const body = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tables: dump });
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cloudmail-backup-${timestamp}.json"`,
        "Content-Length": Buffer.byteLength(body).toString(),
      },
    });
  } catch (err) {
    console.error("Backup error:", err);
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
