---
name: bring-list
description: "Manage Bring! shopping lists. Add, remove, complete, and view items on shared shopping lists. Use when the user wants to manage grocery/shopping lists, add items to buy, check off purchased items, or view what's on their Bring! list."
---

# Bring! Shopping Lists

Manage Bring! shopping lists via the unofficial REST API. Requires `curl` and `jq`.

## Agent Setup Guide

When a user asks you to set up or use Bring for the first time, follow these steps:

### Step 1: Check if already configured
Run `scripts/bring.sh lists` first. If it works, setup is already done — skip to usage.

### Step 2: Ask for credentials
Tell the user:
- "I need your Bring! login (email + password). If you don't have an account yet, you can create one for free at getbring.com or in the Bring! app."
- **If they signed up via Google/Apple:** They need to set a direct password first in the Bring! app (Settings → Account → Change Password).
- **Never store credentials in chat.** Write them directly to the config file.
- If the user is uncomfortable sharing their password in chat, suggest they create the file manually:
  `~/.config/bring/credentials.json` with `{"email": "...", "password": "..."}`

**⚠️ Do NOT use `scripts/bring.sh setup`** — it requires an interactive terminal (TTY) which agents don't have. Always create the credentials file manually as shown in Step 3.

### Step 3: Save credentials and test login
```bash
mkdir -p ~/.config/bring
cat > ~/.config/bring/credentials.json << 'EOF'
{"email": "USER_EMAIL", "password": "USER_PASSWORD"}
EOF
chmod 600 ~/.config/bring/credentials.json
scripts/bring.sh login
```
If login fails: double-check email/password. The user may need their Bring! password (not Google/Apple SSO — Bring requires a direct account password).

### Step 4: Show existing lists and ask for a default
```bash
scripts/bring.sh lists
```
This shows all the user's Bring! lists. The user may have multiple lists, e.g.:
- Einkaufsliste (main grocery list)
- Drogerie (drugstore items)
- Baumarkt (hardware store)
- A shared list with a partner/family

**Ask the user which list should be the default.** This lets them skip typing the list name every time.

If they have only ONE list: set it as default automatically and inform them.
If they have MULTIPLE lists: show the list names and ask which one to use as default. Explain they can still target other lists by name (e.g., "Put nails on the Baumarkt list").

### Step 5: Set default list
Update the credentials file to include the chosen default:
```bash
# Read existing config and add default_list
jq --arg list "CHOSEN_LIST_NAME" '. + {default_list: $list}' ~/.config/bring/credentials.json > /tmp/bring_conf.json && mv /tmp/bring_conf.json ~/.config/bring/credentials.json
chmod 600 ~/.config/bring/credentials.json
```

### Step 6: Confirm setup
Show the user their current list content to confirm everything works:
```bash
scripts/bring.sh show
```
Tell them: "All set! You can now say things like 'Put milk on the list' or 'What's on the shopping list?'"

### Handling shared lists
Bring! lists are often shared between family members or partners. Changes made by the agent sync instantly to all devices sharing that list. Inform the user:
- "Any items I add will show up immediately on all phones that share this list."
- This is usually desired (e.g., partner sees the updated grocery list), but worth mentioning.

## Setup (manual / reference)

Credentials via env vars `BRING_EMAIL` + `BRING_PASSWORD`, or config file `~/.config/bring/credentials.json`:

```json
{"email": "user@example.com", "password": "secret", "default_list": "Einkaufsliste"}
```

Interactive setup (TTY required): `scripts/bring.sh setup`

## Commands

All commands accept a list name (partial match) or UUID. If `default_list` is configured, the list argument can be omitted.

```bash
# List all shopping lists
scripts/bring.sh lists

# Show items on a list (or default list)
scripts/bring.sh show
scripts/bring.sh show "Einkaufsliste"

# Add item (with optional specification/quantity)
scripts/bring.sh add "Milch" "fettarm, 1L"
scripts/bring.sh add "Einkaufsliste" "Milch" "fettarm, 1L"

# Add multiple items at once (use "item|spec" for specifications)
scripts/bring.sh add-multi "Brot" "Käse|Gouda" "Butter|irische"

# Complete/check off item (moves to recently purchased)
scripts/bring.sh complete "Milch"

# Complete multiple items at once
scripts/bring.sh complete-multi "Milch" "Brot" "Käse"

# Move item back from recently to purchase list
scripts/bring.sh uncomplete "Milch"

# Remove item entirely
scripts/bring.sh remove "Milch"

# Remove multiple items at once
scripts/bring.sh remove-multi "Milch" "Brot" "Käse"
```

## Targeting specific lists

When the user has multiple lists, they can target a specific one by name:
- "Put nails on the **Baumarkt** list" → `scripts/bring.sh add "Baumarkt" "Nails"`
- "What's on the **Drogerie** list?" → `scripts/bring.sh show "Drogerie"`

List names support partial case-insensitive matching, so "einkauf" matches "Einkaufsliste".

If no list is specified, the `default_list` from the config is used.

## JSON Output

Append `--json` to `lists` and `show` for raw JSON:

```bash
scripts/bring.sh lists --json
scripts/bring.sh show --json
scripts/bring.sh show "Einkaufsliste" --json
```

## Notes

- Specifications are the small description text under an item (e.g., quantity, brand)
- `complete` moves items to "recently purchased" (like checking off in the app)
- `remove` deletes items entirely from the list
- Token is cached at `~/.cache/bring/token.json` and auto-refreshed
- Changes sync instantly to all devices sharing the list
- Item names with special characters (quotes, umlauts, emoji) are fully supported
- Bring! requires a direct account password — Google/Apple SSO logins don't work with the API
- `country` in credentials.json controls the item catalog language (default: `DE`)
- When showing items to the user, consider only showing the "TO BUY" section unless they specifically ask for recently completed items — the recently list can be very long
- If `remove` fails with "not found", suggest the user check the exact item name with `show`
