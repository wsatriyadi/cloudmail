import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

export async function POST() {
  try {
    const secret = crypto.randomBytes(32).toString("hex");

    db.run(
      sql`INSERT INTO settings (key, value, updated_at) VALUES ('worker_secret', ${secret}, unixepoch())
          ON CONFLICT(key) DO UPDATE SET value = ${secret}, updated_at = unixepoch()`
    );

    return NextResponse.json({ secret });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
