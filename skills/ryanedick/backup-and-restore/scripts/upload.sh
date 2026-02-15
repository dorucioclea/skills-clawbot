#!/usr/bin/env bash
# upload.sh — Upload the latest local backup to configured cloud destinations.
# Part of the OpenClaw backup skill.
set -euo pipefail

# ---------------------------------------------------------------------------
# Paths & defaults
# ---------------------------------------------------------------------------
OPENCLAW_DIR="$HOME/.openclaw"
SKILL_DIR="$OPENCLAW_DIR/workspace/skills/backup"
CONFIG_FILE="$SKILL_DIR/config.json"
CRED_DIR="$OPENCLAW_DIR/credentials/backup"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/openclaw}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[upload] $(date '+%H:%M:%S') $*"; }
die()  { echo "[upload] ERROR: $*" >&2; exit 1; }
warn() { echo "[upload] WARNING: $*" >&2; }

require_cmd() {
  command -v "$1" &>/dev/null || die "$1 is required but not installed. $2"
}

# ---------------------------------------------------------------------------
# Find backup file
# ---------------------------------------------------------------------------
if [[ "${1:-}" != "" && -f "${1:-}" ]]; then
  BACKUP_FILE="$1"
else
  # Find the latest backup
  BACKUP_FILE="$(ls -t "$BACKUP_DIR"/openclaw-*.tar.gz* 2>/dev/null | head -1 || true)"
  [[ -n "$BACKUP_FILE" ]] || die "No backup files found in $BACKUP_DIR"
fi

log "Uploading: $BACKUP_FILE"
FILENAME="$(basename "$BACKUP_FILE")"

# ---------------------------------------------------------------------------
# Read destinations from config
# ---------------------------------------------------------------------------
if ! command -v jq &>/dev/null; then
  die "jq is required to read config.json. Install with: sudo apt install jq"
fi

[[ -f "$CONFIG_FILE" ]] || die "Config not found: $CONFIG_FILE"

DEST_COUNT=$(jq '.destinations | length' "$CONFIG_FILE")
if [[ "$DEST_COUNT" -eq 0 ]]; then
  die "No destinations configured in $CONFIG_FILE"
fi

# ---------------------------------------------------------------------------
# Upload functions
# ---------------------------------------------------------------------------
upload_s3() {
  local bucket region
  bucket=$(echo "$1" | jq -r '.bucket')
  region=$(echo "$1" | jq -r '.region // "us-east-1"')

  require_cmd aws "Install with: pip install awscli"

  # Load credentials if available
  if [[ -f "$CRED_DIR/aws-credentials" ]]; then
    source "$CRED_DIR/aws-credentials"
  fi

  aws s3 cp "$BACKUP_FILE" "${bucket%/}/$FILENAME" --region "$region"
}

upload_r2() {
  local bucket endpoint
  bucket=$(echo "$1" | jq -r '.bucket')
  endpoint=$(echo "$1" | jq -r '.endpoint')

  require_cmd aws "Install with: pip install awscli"

  # Load R2 credentials
  if [[ -f "$CRED_DIR/r2-credentials" ]]; then
    source "$CRED_DIR/r2-credentials"
  fi

  aws s3 cp "$BACKUP_FILE" "s3://${bucket}/$FILENAME" \
    --endpoint-url "$endpoint"
}

upload_b2() {
  local bucket
  bucket=$(echo "$1" | jq -r '.bucket')

  require_cmd b2 "Install with: pip install b2"

  # Load B2 credentials
  if [[ -f "$CRED_DIR/b2-credentials" ]]; then
    source "$CRED_DIR/b2-credentials"
  fi

  b2 upload-file "$bucket" "$BACKUP_FILE" "$FILENAME"
}

upload_gcs() {
  local bucket
  bucket=$(echo "$1" | jq -r '.bucket')

  require_cmd gsutil "Install with: pip install gsutil or snap install google-cloud-cli"

  # Activate service account if key exists
  if [[ -f "$CRED_DIR/gcs-key.json" ]]; then
    gcloud auth activate-service-account --key-file="$CRED_DIR/gcs-key.json" 2>/dev/null || true
  fi

  gsutil cp "$BACKUP_FILE" "${bucket%/}/$FILENAME"
}

upload_gdrive() {
  local folder
  folder=$(echo "$1" | jq -r '.folder // "OpenClaw Backups"')

  require_cmd rclone "Install from https://rclone.org/install/"

  local rclone_conf="$CRED_DIR/rclone.conf"
  [[ -f "$rclone_conf" ]] || die "rclone.conf not found at $rclone_conf"

  rclone copy "$BACKUP_FILE" "gdrive:$folder/" --config "$rclone_conf"
}

upload_rsync() {
  local target
  target=$(echo "$1" | jq -r '.target')

  require_cmd rsync "Install with: sudo apt install rsync"

  rsync -avz "$BACKUP_FILE" "$target/"
}

# ---------------------------------------------------------------------------
# Process each destination
# ---------------------------------------------------------------------------
SUCCESSES=0
FAILURES=0

for i in $(seq 0 $((DEST_COUNT - 1))); do
  DEST=$(jq ".destinations[$i]" "$CONFIG_FILE")
  DTYPE=$(echo "$DEST" | jq -r '.type')

  log "Uploading to $DTYPE..."

  if upload_"$DTYPE" "$DEST" 2>&1; then
    log "✓ $DTYPE upload succeeded"
    SUCCESSES=$((SUCCESSES + 1))
  else
    warn "✗ $DTYPE upload failed"
    FAILURES=$((FAILURES + 1))
  fi
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log "Upload complete: $SUCCESSES succeeded, $FAILURES failed (of $DEST_COUNT)"

[[ "$FAILURES" -eq 0 ]] || exit 1
