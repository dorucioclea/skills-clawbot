#!/bin/bash
set -e

# vnsh read script for OpenClaw skill
# Zero-dependency mode: falls back to raw curl+openssl if 'vn' CLI is not available
#
# Usage:
#   read.sh <vnsh_url>
#
# Output: prints the absolute path to a temp file with the correct extension

VNSH_HOST="${VNSH_HOST:-https://vnsh.dev}"

# Check core dependencies
command -v openssl >/dev/null 2>&1 || { echo "error: openssl required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "error: curl required" >&2; exit 1; }

if [ -z "$1" ]; then
  echo "error: vnsh URL is required." >&2
  exit 1
fi

URL="$1"

# Parse URL components
FRAGMENT="${URL#*#}"
if [ "$FRAGMENT" = "$URL" ]; then
  echo "error: Invalid URL — missing fragment (#k=...&iv=...)" >&2
  exit 1
fi

PATH_PART="${URL%%#*}"
BLOB_ID=$(echo "$PATH_PART" | grep -oE '/v/[a-f0-9-]+' | sed 's|/v/||')
if [ -z "$BLOB_ID" ]; then
  echo "error: Invalid URL — cannot extract blob ID" >&2
  exit 1
fi

HOST=$(echo "$PATH_PART" | grep -oE 'https?://[^/]+')
[ -z "$HOST" ] && HOST="$VNSH_HOST"

# Parse key and IV from fragment
KEY=""
IV=""
IFS='&' read -ra PARAMS <<< "$FRAGMENT"
for PARAM in "${PARAMS[@]}"; do
  case "$PARAM" in
    k=*) KEY="${PARAM#k=}" ;;
    iv=*) IV="${PARAM#iv=}" ;;
  esac
done

if [ -z "$KEY" ] || [ ${#KEY} -ne 64 ]; then
  echo "error: Invalid key (expected 64 hex chars, got ${#KEY})" >&2
  exit 1
fi
if [ -z "$IV" ] || [ ${#IV} -ne 32 ]; then
  echo "error: Invalid IV (expected 32 hex chars, got ${#IV})" >&2
  exit 1
fi

# Fetch encrypted blob
ENCRYPTED=$(mktemp)
trap "rm -f '$ENCRYPTED'" EXIT

HTTP_CODE=$(curl -s -w "%{http_code}" -o "$ENCRYPTED" "${HOST}/api/blob/${BLOB_ID}")

case "$HTTP_CODE" in
  200) ;;
  402) echo "error: Payment required." >&2; exit 1 ;;
  404) echo "error: Not found — may have expired." >&2; exit 1 ;;
  410) echo "error: Expired." >&2; exit 1 ;;
  *)   echo "error: HTTP $HTTP_CODE" >&2; exit 1 ;;
esac

# Decrypt to temp file
DECRYPTED=$(mktemp "/tmp/vnsh-decrypted-XXXXXX")

if ! openssl enc -d -aes-256-cbc -K "$KEY" -iv "$IV" -in "$ENCRYPTED" -out "$DECRYPTED" 2>/dev/null; then
  rm -f "$DECRYPTED"
  echo "error: Decryption failed." >&2
  exit 1
fi

if [ ! -s "$DECRYPTED" ]; then
  rm -f "$DECRYPTED"
  echo "error: Decrypted content is empty." >&2
  exit 1
fi

# Detect MIME type and add appropriate extension
MIME_TYPE=$(file --brief --mime-type "$DECRYPTED" 2>/dev/null || echo "application/octet-stream")
EXT=""

case "$MIME_TYPE" in
  image/jpeg)        EXT=".jpg" ;;
  image/png)         EXT=".png" ;;
  image/gif)         EXT=".gif" ;;
  image/webp)        EXT=".webp" ;;
  text/plain)        EXT=".txt" ;;
  text/markdown)     EXT=".md" ;;
  application/json)  EXT=".json" ;;
  application/pdf)   EXT=".pdf" ;;
  text/html)         EXT=".html" ;;
  text/xml)          EXT=".xml" ;;
  text/csv)          EXT=".csv" ;;
  *)
    if [[ "$MIME_TYPE" == text/* ]]; then
      EXT=".txt"
    else
      EXT=".bin"
    fi
    ;;
esac

FINAL_PATH="${DECRYPTED}${EXT}"
mv "$DECRYPTED" "$FINAL_PATH"

echo "$FINAL_PATH"
