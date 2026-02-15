#!/usr/bin/env bash
# backup.sh — Create a local encrypted backup of ~/.openclaw/
# Part of the OpenClaw backup skill.
set -euo pipefail

# ---------------------------------------------------------------------------
# Paths & defaults
# ---------------------------------------------------------------------------
OPENCLAW_DIR="$HOME/.openclaw"
SKILL_DIR="$OPENCLAW_DIR/workspace/skills/backup"
CONFIG_FILE="$SKILL_DIR/config.json"
CRED_DIR="$OPENCLAW_DIR/credentials/backup"
DEFAULT_BACKUP_DIR="$HOME/backups/openclaw"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[backup] $(date '+%H:%M:%S') $*"; }
die()  { echo "[backup] ERROR: $*" >&2; exit 1; }

read_config() {
  # Read a key from config.json; return empty string if missing
  local key="$1"
  if [[ -f "$CONFIG_FILE" ]] && command -v jq &>/dev/null; then
    jq -r ".$key // empty" "$CONFIG_FILE" 2>/dev/null || true
  fi
}

# ---------------------------------------------------------------------------
# Configuration (config.json → env var → default)
# ---------------------------------------------------------------------------
MODE="${BACKUP_MODE:-$(read_config mode)}"
MODE="${MODE:-full}"

ENCRYPT="${BACKUP_ENCRYPT:-$(read_config encrypt)}"
ENCRYPT="${ENCRYPT:-true}"

RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-$(read_config retainDays)}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"

STOP_GATEWAY="${BACKUP_STOP_GATEWAY:-true}"

BACKUP_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"

# Passphrase: env var → file
PASSPHRASE="${BACKUP_PASSPHRASE:-}"
if [[ -z "$PASSPHRASE" && -f "$CRED_DIR/backup-passphrase" ]]; then
  PASSPHRASE="$(cat "$CRED_DIR/backup-passphrase")"
fi

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
[[ -d "$OPENCLAW_DIR" ]] || die "OpenClaw directory not found at $OPENCLAW_DIR"

if [[ "$MODE" == "full" && "$ENCRYPT" != "true" ]]; then
  die "Full-mode backups include credentials and MUST be encrypted. Set BACKUP_ENCRYPT=true and provide a passphrase, or use BACKUP_MODE=portable to skip credentials."
fi

if [[ "$ENCRYPT" == "true" && -z "$PASSPHRASE" ]]; then
  die "Encryption enabled but no passphrase found. Set BACKUP_PASSPHRASE or create $CRED_DIR/backup-passphrase"
fi

if ! command -v jq &>/dev/null; then
  log "WARNING: jq not installed — config.json will not be read. Install with: sudo apt install jq"
fi

# ---------------------------------------------------------------------------
# Prepare
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date '+%Y%m%d-%H%M')"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo unknown)"
ARCHIVE_NAME="openclaw-${HOSTNAME_SHORT}-${TIMESTAMP}.tar.gz"

# Build tar exclude list
EXCLUDES=()
if [[ "$MODE" == "portable" ]]; then
  EXCLUDES+=(--exclude='./credentials')
  log "Mode: portable (excluding credentials/)"
else
  log "Mode: full"
fi

# ---------------------------------------------------------------------------
# Stop gateway for consistency
# ---------------------------------------------------------------------------
GATEWAY_WAS_RUNNING=false
if [[ "$STOP_GATEWAY" == "true" ]]; then
  if command -v openclaw &>/dev/null && openclaw gateway status 2>/dev/null | grep -qi "running"; then
    log "Stopping gateway for consistent backup..."
    openclaw gateway stop 2>/dev/null || true
    GATEWAY_WAS_RUNNING=true
  fi
fi

# Ensure gateway restarts on exit if we stopped it
cleanup() {
  if [[ "$GATEWAY_WAS_RUNNING" == "true" ]]; then
    log "Restarting gateway..."
    openclaw gateway start 2>/dev/null || log "WARNING: Failed to restart gateway. Run: openclaw gateway start"
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Create archive
# ---------------------------------------------------------------------------
log "Creating archive..."
ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE_NAME"

tar czf "$ARCHIVE_PATH" \
  -C "$HOME" \
  "${EXCLUDES[@]}" \
  .openclaw/

log "Archive created: $ARCHIVE_PATH ($(du -h "$ARCHIVE_PATH" | cut -f1))"

# ---------------------------------------------------------------------------
# Encrypt
# ---------------------------------------------------------------------------
if [[ "$ENCRYPT" == "true" ]]; then
  log "Encrypting with AES-256 (GPG symmetric)..."
  gpg --batch --yes --symmetric --cipher-algo AES256 \
    --passphrase "$PASSPHRASE" \
    --output "${ARCHIVE_PATH}.gpg" \
    "$ARCHIVE_PATH"
  rm -f "$ARCHIVE_PATH"
  ARCHIVE_PATH="${ARCHIVE_PATH}.gpg"
  log "Encrypted: $ARCHIVE_PATH ($(du -h "$ARCHIVE_PATH" | cut -f1))"
fi

# ---------------------------------------------------------------------------
# Prune old backups
# ---------------------------------------------------------------------------
if [[ "$RETAIN_DAYS" -gt 0 ]]; then
  PRUNED=$(find "$BACKUP_DIR" -name 'openclaw-*.tar.gz*' -mtime +"$RETAIN_DAYS" -print -delete 2>/dev/null | wc -l)
  if [[ "$PRUNED" -gt 0 ]]; then
    log "Pruned $PRUNED backup(s) older than $RETAIN_DAYS days"
  fi
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
log "Backup complete: $ARCHIVE_PATH"
echo "$ARCHIVE_PATH"
