---
name: sns-auto-poster
version: 1.0.0
description: Automated SNS posting with cron scheduling. Supports X (Twitter), with extensible architecture for Bluesky, Mastodon, and other platforms. Use when user says "auto post", "scheduled post", "SNS自動投稿", "定期投稿", or "schedule tweet".
---

# SNS Auto Poster

Automated social media posting with cron-based scheduling and multi-platform support.

## Features

- **Cron scheduling** — Set up recurring posts via OpenClaw cron jobs
- **Multi-platform** — X (Twitter) built-in, extensible to Bluesky/Mastodon
- **Post queue** — JSON-based post queue with status tracking
- **Templates** — Use post templates with variable substitution
- **Image support** — Attach images to scheduled posts

## Quick Start

```bash
# Add a post to the queue
python3 {skill_dir}/poster.py add --platform x --text "Scheduled post!" --schedule "2025-01-15 09:00"

# Add with image
python3 {skill_dir}/poster.py add --platform x --text "Morning update" --image /path/to/img.png

# Process pending posts (run this from cron)
python3 {skill_dir}/poster.py run

# List queued posts
python3 {skill_dir}/poster.py list

# Clear completed posts
python3 {skill_dir}/poster.py clean
```

## Cron Setup

Use OpenClaw cron to schedule automatic posting:

```
# Process post queue every 15 minutes
openclaw cron add --schedule "*/15 * * * *" --command "python3 {skill_dir}/poster.py run"

# Daily morning post
openclaw cron add --schedule "0 9 * * *" --command "python3 {skill_dir}/poster.py run-template morning"
```

Or use the agent to set up cron jobs conversationally.

## Configuration

### Environment Variables

| Variable | Platform | Description |
|----------|----------|-------------|
| `X_CONSUMER_KEY` | X/Twitter | API Consumer Key |
| `X_CONSUMER_SECRET` | X/Twitter | API Consumer Secret |
| `X_ACCESS_TOKEN` | X/Twitter | OAuth Access Token |
| `X_ACCESS_TOKEN_SECRET` | X/Twitter | OAuth Access Token Secret |
| `BLUESKY_HANDLE` | Bluesky | Bluesky handle (user.bsky.social) |
| `BLUESKY_APP_PASSWORD` | Bluesky | Bluesky app password |

### Post Queue File

Posts are stored in `{skill_dir}/queue.json`:

```json
[
  {
    "id": "uuid",
    "platform": "x",
    "text": "Hello world!",
    "image": null,
    "schedule": "2025-01-15T09:00:00",
    "status": "pending",
    "posted_at": null
  }
]
```

### Templates

Create templates in `{skill_dir}/templates/`:

```json
// templates/morning.json
{
  "platform": "x",
  "text": "☀️ Good morning! Today is {date}. {custom_message}",
  "schedule_time": "09:00"
}
```

## Supported Platforms

| Platform | Status | Auth Method |
|----------|--------|-------------|
| X (Twitter) | ✅ Ready | OAuth 1.0a |
| Bluesky | 🔜 Planned | App Password |
| Mastodon | 🔜 Planned | OAuth 2.0 |

## Requirements

- Python 3.8+
- `requests` library
- OpenClaw cron (for scheduling)
- Platform API credentials

## Architecture

```
sns-auto-poster/
├── poster.py        # Main CLI entry point
├── platforms/
│   ├── x.py         # X/Twitter posting (OAuth 1.0a)
│   ├── bluesky.py   # Bluesky posting (planned)
│   └── base.py      # Base platform interface
├── queue.json       # Post queue
└── templates/       # Post templates
```
