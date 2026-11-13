#!/bin/bash

# Setup daily email cleanup cron job for CloudMail.
# Retensi mengikuti settings.email_retention_days (default 30 hari, 0 = selamanya).

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
CRON_SECRET="${CRON_SECRET:-$(grep -E '^CRON_SECRET=' "$APP_DIR/.env" 2>/dev/null | cut -d= -f2-)}"

if [ -z "$CRON_SECRET" ]; then
  echo "⚠️  CRON_SECRET belum diatur di environment atau .env."
  echo "   Endpoint cleanup hanya bisa dipanggil oleh session admin."
fi

CRON_COMMAND="0 2 * * * curl -s -X POST -H \"Authorization: Bearer $CRON_SECRET\" http://localhost:8090/api/cron/cleanup-emails >/dev/null 2>&1"
CRON_EXISTS=$(crontab -l 2>/dev/null | grep -F "cleanup-emails" | wc -l)

if [ "$CRON_EXISTS" -gt 0 ]; then
    echo "✓ Cron job already exists"
    crontab -l | grep "cleanup-emails"
else
    echo "Adding daily email cleanup cron job..."
    (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -
    echo "✓ Cron job added successfully"
    echo "✓ Will run daily at 2:00 AM"
fi

echo ""
echo "Current crontab:"
crontab -l

echo ""
echo "To manually trigger cleanup:"
echo "curl -X POST -H \"Authorization: Bearer \$CRON_SECRET\" http://localhost:8090/api/cron/cleanup-emails"
