import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { logAudit, getClientIP } from "@/lib/audit";
import fs from "fs/promises";
import path from "path";

// Download backup
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
  }

  try {
    const dbPath = process.env.DATABASE_PATH || "./data/cloudmail.db";
    const resolvedPath = path.resolve(dbPath);
    const file = await fs.readFile(resolvedPath);

    logAudit({
      userId: session.user.id,
      action: "backup_download",
      ipAddress: getClientIP(request),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return new Response(file, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="cloudmail-backup-${timestamp}.db"`,
        "Content-Length": file.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("Backup error:", err);
    return NextResponse.json({ error: "Gagal membuat backup" }, { status: 500 });
  }
}
