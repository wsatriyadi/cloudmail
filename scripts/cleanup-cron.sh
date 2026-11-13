#!/usr/bin/env bash
# Jalankan cleanup email PostgreSQL dari cron.
# Retensi mengikuti settings.email_retention_days (0 = simpan selamanya).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/.env"
  set +a
fi

: "${CRON_SECRET:?CRON_SECRET belum diisi di .env}"

# Jangan pakai PORT dari .env: aplikasi production berjalan di 8090 lewat PM2.
PORT_APP="${CLEANUP_PORT:-8090}"

curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:${PORT_APP}/api/cron/cleanup-emails"
