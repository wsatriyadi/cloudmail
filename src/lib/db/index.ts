import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || "./data/cloudmail.db";

// Pastikan direktori data ada
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL mode untuk performa lebih baik
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
// Tunggu (bukan langsung error SQLITE_BUSY) saat ada koneksi lain yang mengunci —
// mencegah race saat next build membuka DB dari beberapa worker paralel.
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
export { sqlite };
