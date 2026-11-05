#!/usr/bin/env bash
# Import TSV hasil export-sqlite-tsv.js ke PostgreSQL memakai COPY.
# Prasyarat: skema sudah dibuat (drizzle-kit push), ingest dihentikan.
#
# Pemakaian: DATABASE_URL=... ./scripts/import-tsv-to-postgres.sh <tsvDir>

set -euo pipefail

TSV_DIR="${1:-/tmp/cloudmail-pg}"
: "${DATABASE_URL:?DATABASE_URL wajib diisi}"

TABLES=(
  users domains api_keys emails email_bodies attachments
  rate_limit_entries aliases audit_logs settings
  nama_depan nama_belakang identitas
)

# Tabel dengan kolom identitas/serial: setelah copy, sequence harus sinkron
# dengan MAX(id) supaya insert berikutnya tidak bentrok.
SERIAL_TABLES=(rate_limit_entries audit_logs nama_depan nama_belakang)

echo "==> Mengosongkan tabel (urutan child dulu)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
TRUNCATE TABLE
  identitas, nama_belakang, nama_depan, settings, audit_logs,
  aliases, rate_limit_entries, attachments, email_bodies, emails,
  api_keys, domains, users
RESTART IDENTITY CASCADE;
SQL

for table in "${TABLES[@]}"; do
  file="$TSV_DIR/$table.tsv"
  if [[ ! -s "$file" ]]; then
    echo "-- $table: file kosong/tidak ada, dilewati"
    continue
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "\copy $table FROM '$file' WITH (FORMAT text, NULL '\N')"
  rows=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM $table")
  echo "-- $table: $rows baris di PostgreSQL"
done

for table in "${SERIAL_TABLES[@]}"; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
    "SELECT setval(pg_get_serial_sequence('$table','id'), COALESCE((SELECT MAX(id) FROM $table), 0) + 1, false)"
done

echo "==> Verifikasi foreign key"
fk_issues=$(psql "$DATABASE_URL" -tAc "
  SELECT COUNT(*) FROM (
    SELECT 1 FROM emails e LEFT JOIN domains d ON d.id = e.domain_id WHERE d.id IS NULL
    UNION ALL
    SELECT 1 FROM email_bodies b LEFT JOIN emails e ON e.id = b.email_id WHERE e.id IS NULL
    UNION ALL
    SELECT 1 FROM attachments a LEFT JOIN emails e ON e.id = a.email_id WHERE e.id IS NULL
    UNION ALL
    SELECT 1 FROM aliases al LEFT JOIN domains d ON d.id = al.domain_id WHERE d.id IS NULL
    UNION ALL
    SELECT 1 FROM identitas i LEFT JOIN domains d ON d.id = i.domain_id WHERE d.id IS NULL
    UNION ALL
    SELECT 1 FROM api_keys k LEFT JOIN users u ON u.id = k.created_by_id WHERE u.id IS NULL
  ) t")
echo "FK orphan rows: $fk_issues"
[[ "$fk_issues" == "0" ]] || { echo "FK tidak konsisten"; exit 1; }

echo "Selesai."
