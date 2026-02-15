---
name: backup
description: Backup, restore, disaster recovery, and migration for OpenClaw. Encrypts and stores ~/.openclaw/ locally and to cloud destinations (S3, R2, B2, GCS, Google Drive, rsync).
---

# Backup Skill

Backup and restore your entire OpenClaw installation — config, credentials, workspace, memory, and skills.

## Quick Start

```bash
# Run a backup now (local, encrypted)
~/.openclaw/workspace/skills/backup/scripts/backup.sh

# Upload latest backup to configured cloud destinations
~/.openclaw/workspace/skills/backup/scripts/upload.sh

# Restore from a backup file
~/.openclaw/workspace/skills/backup/scripts/restore.sh ~/backups/openclaw/openclaw-myhost-20260215-0430.tar.gz.gpg
```

## Interactive Setup

For guided setup, read `references/setup-guide.md` and follow the conversational flow with the user. This walks through encryption, backup mode, schedule, and cloud destination configuration.

## Manual Usage

### backup.sh — Create a local backup

```bash
# Full encrypted backup (default)
./scripts/backup.sh

# Portable mode (no credentials, can skip encryption)
BACKUP_MODE=portable ./scripts/backup.sh

# Skip gateway stop/restart (for testing)
BACKUP_STOP_GATEWAY=false ./scripts/backup.sh
```

Saves to `~/backups/openclaw/` with naming `openclaw-<hostname>-<timestamp>.tar.gz[.gpg]`.

### upload.sh — Upload to cloud

```bash
# Upload latest local backup to all configured destinations
./scripts/upload.sh

# Upload a specific file
./scripts/upload.sh /path/to/backup.tar.gz.gpg
```

### restore.sh — Restore from backup

```bash
# From local file
./scripts/restore.sh ~/backups/openclaw/openclaw-myhost-20260215-0430.tar.gz.gpg

# From cloud destination (downloads first)
./scripts/restore.sh s3://mybucket/openclaw/latest.tar.gz.gpg
```

Moves existing `~/.openclaw/` to `~/.openclaw.pre-restore/` before extracting.

### test-backup.sh — Validate setup

```bash
./scripts/test-backup.sh
```

Creates a tiny test file, encrypts, uploads to all destinations, verifies, cleans up. Exit 0 = all good.

## Config Reference

Config lives at `~/.openclaw/workspace/skills/backup/config.json`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | `"full"` | `full` (everything) or `portable` (skip credentials) |
| `encrypt` | bool | `true` | AES-256 GPG symmetric encryption |
| `retainDays` | number | `30` | Auto-prune local backups older than this |
| `schedule` | string | `"daily"` | `daily`, `weekly`, or `manual` |
| `destinations` | array | `[]` | Cloud upload targets (see destinations.md) |

## Environment Variables

All settings can be overridden via env vars:

| Variable | Description |
|----------|-------------|
| `BACKUP_MODE` | `full` or `portable` |
| `BACKUP_ENCRYPT` | `true` or `false` |
| `BACKUP_RETAIN_DAYS` | Number of days to keep old backups |
| `BACKUP_PASSPHRASE` | Encryption passphrase (or read from credentials file) |
| `BACKUP_STOP_GATEWAY` | `true` (default) or `false` |
| `BACKUP_DIR` | Override backup output directory |

## Credentials

Stored in `~/.openclaw/credentials/backup/`:

- `backup-passphrase` — encryption passphrase
- `aws-credentials` — for S3
- `r2-credentials` — for Cloudflare R2
- `b2-credentials` — for Backblaze B2
- `gcs-key.json` — Google Cloud Storage service account key
- `rclone.conf` — for Google Drive (rclone config)

## Security Notes

- Backups are encrypted by default with AES-256 (GPG symmetric)
- **Full-mode backups REQUIRE encryption** — the script will refuse to run without a passphrase when mode=full, since credentials would be stored in plaintext
- Portable-mode backups exclude credentials and can optionally skip encryption
- The passphrase file at `~/.openclaw/credentials/backup/backup-passphrase` should be readable only by the owner (mode 600)
- On first use, always walk the user through setting a passphrase (see `references/setup-guide.md`)
- If no passphrase is set, default to portable mode — never store credentials unencrypted
- Local backups are auto-pruned after the configured retention period
- Remote backups are never auto-deleted (see `references/destinations.md` for lifecycle guidance)
