#!/usr/bin/env bash
# Migrasi data SQLite -> PostgreSQL memakai COPY dengan daftar kolom eksplisit.
#
# Prasyarat: skema PostgreSQL sudah dibuat (npx drizzle-kit push) dan ingest
# dihentikan supaya tidak ada penulisan baru selama copy.
#
# Pemakaian: DATABASE_URL=... ./scripts/migrate-data.sh

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
cd "$(dirname "$0")/.."

# Urutan: parent dulu agar FK langsung valid.
TABLES=(
  users domains api_keys settings nama_depan nama_belakang
  emails email_bodies attachments aliases identitas rate_limit_entries audit_logs
)
SERIAL_TABLES=(rate_limit_entries audit_logs nama_depan nama_belakang)

echo "==> Mengosongkan tabel"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "
  TRUNCATE TABLE identitas, nama_belakang, nama_depan, settings, audit_logs,
    aliases, rate_limit_entries, attachments, email_bodies, emails,
    api_keys, domains, users RESTART IDENTITY CASCADE"

for table in "${TABLES[@]}"; do
  # Daftar kolom diambil dari skrip supaya urutan selalu sama dengan tujuan.
  cols=$(node scripts/stream-table-to-postgres.js "$table" --columns)
  node scripts/stream-table-to-postgres.js "$table" \
    | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
        -c "COPY $table ($cols) FROM STDIN (FORMAT text, NULL '\N')"
  rows=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM $table")
  echo "-- $table: $rows baris"
done

for table in "${SERIAL_TABLES[@]}"; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "SELECT setval(pg_get_serial_sequence('$table','id'), COALESCE((SELECT MAX(id) FROM $table), 0) + 1, false)" >/dev/null
done

echo "==> Verifikasi FK"
issues=$(psql "$DATABASE_URL" -tAc "
  SELECT COUNT(*) FROM (
    SELECT 1 FROM emails e LEFT JOIN domains d ON d.id = e.domain_id WHERE d.id IS NULL
    UNION ALL SELECT 1 FROM email_bodies b LEFT JOIN emails e ON e.id = b.email_id WHERE e.id IS NULL
    UNION ALL SELECT 1 FROM attachments a LEFT JOIN emails e ON e.id = a.email_id WHERE e.id IS NULL
    UNION ALL SELECT 1 FROM aliases al LEFT JOIN domains d ON d.id = al.domain_id WHERE d.id IS NULL
    UNION ALL SELECT 1 FROM identitas i LEFT JOIN domains d ON d.id = i.domain_id WHERE d.id IS NULL
    UNION ALL SELECT 1 FROM api_keys k LEFT JOIN users u ON u.id = k.created_by_id WHERE u.id IS NULL
  ) t")
echo "FK orphan rows: $issues"
[[ "$issues" == "0" ]] || { echo "FK tidak konsisten"; exit 1; }

echo "==> Bandingkan jumlah baris SQLite vs PostgreSQL"
node -e "
const Database = require('better-sqlite3');
const db = new Database(process.env.SQLITE_PATH || './data/cloudmail.db', { readonly: true });
const tables = ['users','domains','api_keys','emails','email_bodies','attachments','aliases','identitas','rate_limit_entries','audit_logs','settings','nama_depan','nama_belakang'];
for (const t of tables) console.log(t + '=' + db.prepare('SELECT COUNT(*) c FROM ' + t).get().c);
" > /tmp/sqlite-counts.txt
while IFS='=' read -r table sqliteCount; do
  pgCount=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM $table")
  if [[ "$sqliteCount" != "$pgCount" ]]; then
    echo "MISMATCH $table sqlite=$sqliteCount postgres=$pgCount"
    exit 1
  fi
  echo "OK $table=$pgCount"
done < /tmp/sqlite-counts.txt

echo "Selesai. Jumlah baris identik."
