#!/bin/bash
set -e

# vnsh upload script for OpenClaw skill
# Zero-dependency mode: falls back to raw curl+openssl if 'vn' CLI is not available
#
# Usage:
#   upload.sh <file_path> [ttl_hours]       Upload a file
#   echo "content" | upload.sh [ttl_hours]  Upload from stdin
#
# Output: prints only the vnsh URL to stdout

VNSH_HOST="${VNSH_HOST:-https://vnsh.dev}"

# Check core dependencies
command -v openssl >/dev/null 2>&1 || { echo "error: openssl required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "error: curl required" >&2; exit 1; }

# Raw upload function (no vn dependency)
raw_upload() {
  local INPUT_FILE="$1"
  local TTL="${2:-24}"

  KEY=$(openssl rand -hex 32)
  IV=$(openssl rand -hex 16)

  # Encrypt
  ENCRYPTED=$(mktemp)
  trap "rm -f '$ENCRYPTED'" EXIT

  openssl enc -aes-256-cbc -K "$KEY" -iv "$IV" -in "$INPUT_FILE" -out "$ENCRYPTED" 2>/dev/null

  # Upload
  RESP=$(curl -s -X POST \
    --data-binary @"$ENCRYPTED" \
    -H "Content-Type: application/octet-stream" \
    "${VNSH_HOST}/api/drop?ttl=${TTL}")

  ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$ID" ]; then
    echo "error: upload failed: $RESP" >&2
    exit 1
  fi

  echo "${VNSH_HOST}/v/${ID}#k=${KEY}&iv=${IV}"
}

# Parse arguments
TTL=""
FILE_PATH=""

if [ -n "$1" ] && [ -f "$1" ]; then
  FILE_PATH="$1"
  TTL="${2:-24}"
elif [ ! -t 0 ]; then
  # Stdin mode — save to temp file first
  TTL="${1:-24}"
  FILE_PATH=$(mktemp)
  cat > "$FILE_PATH"
  STDIN_TMP="$FILE_PATH"
else
  if [ -n "$1" ] && [ ! -f "$1" ]; then
    echo "error: File not found: '$1'" >&2
    exit 1
  fi
  echo "error: No input. Usage: upload.sh <file> [ttl] or echo 'text' | upload.sh [ttl]" >&2
  exit 1
fi

# Try vn CLI first (faster, prettier), fall back to raw mode
if command -v vn &>/dev/null; then
  if [ -n "$TTL" ] && [ "$TTL" != "24" ]; then
    RESULT=$(vn --ttl "$TTL" "$FILE_PATH" 2>/dev/null | grep '^https://')
  else
    RESULT=$(vn "$FILE_PATH" 2>/dev/null | grep '^https://')
  fi

  if [ -n "$RESULT" ]; then
    echo "$RESULT"
    [ -n "$STDIN_TMP" ] && rm -f "$STDIN_TMP"
    exit 0
  fi
fi

# Fallback: raw curl+openssl
raw_upload "$FILE_PATH" "${TTL:-24}"

# Cleanup stdin temp
[ -n "$STDIN_TMP" ] && rm -f "$STDIN_TMP"
