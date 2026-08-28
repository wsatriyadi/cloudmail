#!/bin/bash

# Setup daily email cleanup cron job for CloudMail
# This script adds a cron job that runs daily at 2 AM to cleanup emails older than 90 days

CRON_COMMAND="0 2 * * * curl -X DELETE http://localhost:8090/api/cron/cleanup-emails >/dev/null 2>&1"
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
echo "curl -X DELETE http://localhost:8090/api/cron/cleanup-emails"
