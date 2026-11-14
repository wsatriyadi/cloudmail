// Migration: domain approval workflow + owner tracking (PostgreSQL).
// Jalankan di dalam container: node scripts/migrate-domain-approval.mjs
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL wajib diisi");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

try {
  await sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS created_by_id text REFERENCES users(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_domains_created_by ON domains (created_by_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_domains_status ON domains (status)`;
  console.log("domain approval migration applied");
} catch (err) {
  console.error("migration failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
