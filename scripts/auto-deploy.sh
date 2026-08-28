#!/usr/bin/env bash
# CloudMail auto-deploy — check GitHub for new commits, redeploy if changed.
# Scheduled via cron at 00:00 WITA (server tz: Asia/Makassar).
# Safe: preserves .env and data/; stashes local docker-compose.yml (ports).
set -euo pipefail

REPO_DIR="$HOME/cloudmail"
BRANCH="main"
REMOTE="origin"
LOG_FILE="$HOME/cloudmail-deploy.log"
LOCK_FILE="/tmp/cloudmail-autodeploy.lock"
WEBHOOK_URL=""  # optional: set a URL to receive POST notifications

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# Optional webhook notification (no-op if WEBHOOK_URL is empty)
notify() {
  local status="$1"
  local detail="$2"
  [ -z "$WEBHOOK_URL" ] && return 0
  curl -s -m 5 -X POST -H "Content-Type: application/json" \
    -d "{\"app\":\"cloudmail\",\"status\":\"$status\",\"detail\":\"$detail\"}" \
    "$WEBHOOK_URL" >/dev/null 2>&1 || true
}

# Prevent overlapping runs
exec 200>"$LOCK_FILE"
flock -n 200 || { log "Another auto-deploy is running; exiting."; exit 0; }

cd "$REPO_DIR" || { log "ERROR: repo dir $REPO_DIR not found"; exit 1; }

log "=== Auto-deploy check started ==="

# Remember current commit
BEFORE=$(git rev-parse --short HEAD 2>/dev/null || echo "none")

# Fetch latest from GitHub (no merge yet)
log "Fetching from GitHub..."
git fetch "$REMOTE" "$BRANCH" 2>&1 | sed 's/^/  /' | tee -a "$LOG_FILE"

# Compare local HEAD vs remote
LOCAL=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "$REMOTE/$BRANCH")

if [ "$LOCAL" = "$REMOTE_SHA" ]; then
  log "No new commits (HEAD=$BEFORE). Nothing to deploy."
  exit 0
fi

log "New commits detected: $BEFORE -> ${REMOTE_SHA:0:7}"
git log --oneline "$LOCAL..$REMOTE_SHA" 2>&1 | head -10 | sed 's/^/  /' | tee -a "$LOG_FILE"

# Stash local docker-compose.yml changes (ports mapping) before pull
STASHED=""
if ! git diff --quiet -- docker-compose.yml; then
  log "Stashing local docker-compose.yml changes..."
  git stash push -m "auto-deploy-stash-$(date +%s)" -- docker-compose.yml 2>&1 | sed 's/^/  /' | tee -a "$LOG_FILE"
  STASHED=1
fi

# Also discard any local Dockerfile modifications (GitHub is source of truth)
git checkout -- Dockerfile 2>/dev/null || true

# Pull
log "Pulling latest code..."
if ! git pull --ff-only "$REMOTE" "$BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
  log "ERROR: git pull failed. Aborting deploy."
  [ -n "$STASHED" ] && git stash pop 2>/dev/null || true
  notify "deploy-failed" "git pull failed"
  exit 1
fi

# Restore stashed compose changes
if [ -n "$STASHED" ]; then
  log "Restoring local docker-compose.yml..."
  git stash pop 2>&1 | sed 's/^/  /' | tee -a "$LOG_FILE" || log "WARN: stash pop conflict — ports may be missing"
fi

# Verify .env still present (never overwrite)
if [ ! -f "$REPO_DIR/.env" ]; then
  log "ERROR: .env missing after pull! Aborting."
  notify "deploy-failed" ".env missing"
  exit 1
fi

# Verify database exists and is non-empty
DB_FILE="$REPO_DIR/data/cloudmail.db"
if [ ! -s "$DB_FILE" ]; then
  log "ERROR: database missing or empty at $DB_FILE! Aborting deploy."
  notify "deploy-failed" "database missing"
  exit 1
fi

log "Pre-deploy checks passed (.env OK, DB OK)."

# Build new image
log "Building Docker image..."
if ! sudo -n docker compose build 2>&1 | tail -20 | tee -a "$LOG_FILE"; then
  log "ERROR: docker build failed. Container not restarted."
  notify "deploy-failed" "docker build failed"
  exit 1
fi

# Deploy
log "Deploying new container..."
sudo -n docker compose up -d 2>&1 | sed 's/^/  /' | tee -a "$LOG_FILE"
sleep 10

# Verify health
HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://localhost:8090/login || echo "000")
AFTER=$(git rev-parse --short HEAD)

if [ "$HTTP" = "200" ]; then
  log "Deploy SUCCESS: $BEFORE -> $AFTER. Health check HTTP $HTTP."
  notify "deploy-success" "$BEFORE -> $AFTER (HTTP $HTTP)"
else
  log "WARN: Deploy completed but health check returned HTTP $HTTP. Check logs."
  notify "deploy-unhealthy" "$BEFORE -> $AFTER (HTTP $HTTP)"
fi

log "=== Auto-deploy finished ==="
exit 0
