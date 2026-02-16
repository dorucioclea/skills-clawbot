# 🛒 bring-list — Bring! Shopping Lists for OpenClaw

The most complete Bring! skill for OpenClaw. Zero dependencies beyond `curl` and `jq` — no Node.js, no Python, no npm packages. Clean, auditable bash code.

## Why bring-list?

There are several Bring! skills on ClawHub. Here's why this one is different:

| | **bring-list** | Others |
|---|---|---|
| Dependencies | `curl` + `jq` only | Node.js + npm packages |
| Features | add, remove, complete, uncomplete, multi-ops | add, remove only |
| Default list | By name (partial match) | By UUID only |
| Agent Setup Guide | Step-by-step for agents | None |
| Batch operations | add/remove/complete-multi | Not available |
| Special characters | Full support (quotes, umlauts, emoji) | Varies |
| Security | Clean code, no flags | Some flagged by VirusTotal |

## Features

- **Add items** to any Bring! list (with optional quantity/description)
- **Add multiple items** at once
- **View** your shopping lists and items
- **Complete/uncomplete** items (check off or move back)
- **Remove** items entirely
- **Multiple lists** supported with partial name matching
- **JSON output** for programmatic use

## Installation

```bash
clawhub install bring
```

## Setup

You need a [Bring!](https://getbring.com) account (free).

### Option 1: Interactive Setup
```bash
scripts/bring.sh setup
```
Follow the prompts to enter your email and password. Credentials are stored securely at `~/.config/bring/credentials.json` (chmod 600).

### Option 2: Environment Variables
```bash
export BRING_EMAIL="your@email.com"
export BRING_PASSWORD="your-password"
```

## Usage Examples

Talk to your agent naturally:
- *"Put milk and eggs on the shopping list"*
- *"What's on our grocery list?"*
- *"Check off the butter"*
- *"Remove bread from the list"*

### CLI Commands

```bash
# List all your Bring! lists
scripts/bring.sh lists

# Show items on a list
scripts/bring.sh show "Einkaufsliste"

# Add an item with description
scripts/bring.sh add "Einkaufsliste" "Milch" "fettarm, 1L"

# Add multiple items at once
scripts/bring.sh add-multi "Einkaufsliste" "Brot" "Käse|Gouda" "Butter|irische"

# Check off an item
scripts/bring.sh complete "Einkaufsliste" "Milch"

# Move item back to purchase list
scripts/bring.sh uncomplete "Einkaufsliste" "Milch"

# Remove an item entirely
scripts/bring.sh remove "Einkaufsliste" "Milch"
```

## Requirements

- `curl`
- `jq`

No Python, Node.js, or other runtimes needed.

## Configuration

Optional fields in `~/.config/bring/credentials.json`:

```json
{
  "email": "your@email.com",
  "password": "your-password",
  "default_list": "Einkaufsliste",
  "country": "DE"
}
```

- `default_list` — Skip typing the list name on every command
- `country` — Country code for Bring API item catalog (default: `DE`). Use `AT`, `CH`, `US`, `FR`, etc.

## Important Notes

- **Google/Apple SSO:** If you signed up for Bring! via Google or Apple, you may not have a direct password. You'll need to set one in the Bring! app (Settings → Account → Change Password) before using this skill.
- **Unofficial API:** This skill uses the same REST API as the Bring! mobile app. It is not an official public API and could change without notice. The skill is tested and stable as of February 2026.
- **Shared lists:** Changes sync instantly to all phones/devices sharing the same list. Your partner will see items you add immediately.

## How It Works

This skill uses the unofficial Bring! REST API (same endpoints as the mobile app). Your credentials are used to obtain an auth token, which is cached locally at `~/.cache/bring/token.json` and auto-refreshed when expired.

**Your credentials never leave your machine.** They are stored locally and only sent directly to Bring!'s authentication servers.

## Privacy & Security

- Credentials stored with `chmod 600` (owner-only access)
- Token cached locally, auto-refreshed
- No external services involved — direct communication with Bring! API only
- No credentials are included in the skill package
- The API key in the script is a public app key (same for every Bring! client) — not a secret

## License

MIT
