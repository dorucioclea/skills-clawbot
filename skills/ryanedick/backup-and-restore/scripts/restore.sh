#!/usr/bin/env bash
# restore.sh — Restore OpenClaw from a backup file.
# Part of the OpenClaw backup skill.
set -euo pipefail

# ---------------------------------------------------------------------------
# Paths & defaults
# ---------------------------------------------------------------------------
OPENCLAW_DIR="$HOME/.openclaw"
CRED_DIR="$OPENCLAW_DIR/credentials/backup"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { echo "[restore] $(date '+%H:%M:%S') $*"; }
die()  { echo "[restore] ERROR: $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "" ]]; then
  echo "Usage: restore.sh <backup-file-or-cloud-url>"
  echo ""
  echo "Examples:"
  echo "  restore.sh ~/backups/openclaw/openclaw-myhost-20260215-0430.tar.gz.gpg"
  echo "  restore.sh s3://mybucket/openclaw/openclaw-myhost-20260215-0430.tar.gz.gpg"
  echo "  restore.sh gs://mybucket/openclaw/backup.tar.gz"
  exit 1
fi

SOURCE="$1"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

# ---------------------------------------------------------------------------
# Download if remote
# ---------------------------------------------------------------------------
if [[ "$SOURCE" == s3://* ]]; then
  log "Downloading from S3..."
  FILENAME="$(basename "$SOURCE")"
  LOCAL_FILE="$WORK_DIR/$FILENAME"

  if [[ -f "$CRED_DIR/aws-credentials" ]]; then
    source "$CRED_DIR/aws-credentials"
  fi
  aws s3 cp "$SOURCE" "$LOCAL_FILE"

elif [[ "$SOURCE" == gs://* ]]; then
  log "Downloading from GCS..."
  FILENAME="$(basename "$SOURCE")"
  LOCAL_FILE="$WORK_DIR/$FILENAME"

  if [[ -f "$CRED_DIR/gcs-key.json" ]]; then
    gcloud auth activate-service-account --key-file="$CRED_DIR/gcs-key.json" 2>/dev/null || true
  fi
  gsutil cp "$SOURCE" "$LOCAL_FILE"

elif [[ -f "$SOURCE" ]]; then
  LOCAL_FILE="$SOURCE"

else
  die "Source not found or unsupported: $SOURCE"
fi

log "Restoring from: $LOCAL_FILE"

# ---------------------------------------------------------------------------
# Decrypt if needed
# ---------------------------------------------------------------------------
ARCHIVE="$LOCAL_FILE"
if [[ "$ARCHIVE" == *.gpg ]]; then
  log "Decrypting..."

  PASSPHRASE="${BACKUP_PASSPHRASE:-}"
  if [[ -z "$PASSPHRASE" && -f "$CRED_DIR/backup-passphrase" ]]; then
    PASSPHRASE="$(cat "$CRED_DIR/backup-passphrase")"
  fi
  [[ -n "$PASSPHRASE" ]] || die "Encrypted backup but no passphrase. Set BACKUP_PASSPHRASE or create $CRED_DIR/backup-passphrase"

  DECRYPTED="${ARCHIVE%.gpg}"
  # If source was remote, decrypted is already in WORK_DIR; if local, put decrypted in WORK_DIR
  if [[ "$(dirname "$DECRYPTED")" != "$WORK_DIR" ]]; then
    DECRYPTED="$WORK_DIR/$(basename "$DECRYPTED")"
  fi

  gpg --batch --yes --decrypt \
    --passphrase "$PASSPHRASE" \
    --output "$DECRYPTED" \
    "$ARCHIVE"

  ARCHIVE="$DECRYPTED"
  log "Decrypted successfully"
fi

# ---------------------------------------------------------------------------
# Stop gateway
# ---------------------------------------------------------------------------
if command -v openclaw &>/dev/null; then
  log "Stopping gateway..."
  openclaw gateway stop 2>/dev/null || true
fi

# ---------------------------------------------------------------------------
# Safety copy of existing state
# ---------------------------------------------------------------------------
if [[ -d "$OPENCLAW_DIR" ]]; then
  SAFETY="$HOME/.openclaw.pre-restore"
  if [[ -d "$SAFETY" ]]; then
    log "Removing previous pre-restore safety copy..."
    rm -rf "$SAFETY"
  fi
  log "Moving existing ~/.openclaw/ → ~/.openclaw.pre-restore/"
  mv "$OPENCLAW_DIR" "$SAFETY"
fi

# ---------------------------------------------------------------------------
# Extract
# ---------------------------------------------------------------------------
log "Extracting backup..."
mkdir -p "$HOME"
tar xzf "$ARCHIVE" -C "$HOME"

log "Restore complete!"
echo ""
echo "Your previous state is saved at ~/.openclaw.pre-restore/"
echo ""
echo "Next steps:"
echo "  1. Review the restored files at ~/.openclaw/"
echo "  2. Start the gateway:  openclaw gateway start"
echo "  3. If everything works, you can remove the safety copy:"
echo "     rm -rf ~/.openclaw.pre-restore/"
