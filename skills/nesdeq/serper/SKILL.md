---
name: serper
version: 3.0.0
description: Google search via Serper API with full page content extraction using trafilatura. Two modes, explicit locale control. API key via .env.
tags: [search, web-search, serper, google, content-extraction]
---

# Serper

Google search via Serper API. Fetches results AND reads the actual web pages to extract clean full-text content via trafilatura. Not just snippets — full article text.

---

## When to Use This Skill

**Use serper when:**
- Any question that needs current, factual information from the web
- Research topics that need full article content, not just snippets
- News and current events
- Product info, prices, comparisons, reviews
- Technical docs, how-to guides
- Anything where reading the actual page matters

**Do NOT use this skill for:**
- Questions you can answer from your training data
- Pure math, code execution, creative writing
- Greetings, chitchat

**IMPORTANT: This skill already fetches and extracts full page content. Do NOT use web_fetch, WebFetch, or any other URL-fetching tool on the URLs returned by this skill. The content is already included in the output.**

---

## Two Search Modes

There are exactly two modes. Pick the right one based on the query:

### `default` — General search (all-time)
- All-time Google web search, **5 results**, each enriched with full page content
- Use for: general questions, research, how-to, evergreen topics, product info, technical docs, comparisons, tutorials, anything NOT time-sensitive

### `current` — News and recent info
- Past-week Google web search (3 results) + Google News (3 results), each enriched with full page content
- Use for: news, current events, recent developments, breaking news, announcements, anything time-sensitive

#### Mode Selection Guide

| Query signals | Mode |
|---------------|------|
| "how does X work", "what is X", "explain X" | `default` |
| Product research, comparisons, tutorials | `default` |
| Technical documentation, guides | `default` |
| Historical topics, evergreen content | `default` |
| "news", "latest", "today", "this week", "recent" | `current` |
| "what happened", "breaking", "announced", "released" | `current` |
| Current events, politics, sports scores, stock prices | `current` |

---

## Locale (REQUIRED for non-English queries)

**Default is global** — no country filter, English results. This ONLY works for English queries.

**You MUST ALWAYS set `--gl` and `--hl` when ANY of these are true:**
- The user's message is in a non-English language
- The search query you construct is in a non-English language
- The user mentions a specific country, city, or region
- The user asks for local results (prices, news, stores, etc.) in a non-English context

**If the user writes in German, you MUST pass `--gl de --hl de`. No exceptions.**

| Scenario | Flags |
|----------|-------|
| English query, no country target | *(omit --gl and --hl)* |
| German query OR user writes in German OR targeting DE/AT/CH | `--gl de --hl de` |
| French query OR user writes in French OR targeting France | `--gl fr --hl fr` |
| Any other non-English language/country | `--gl XX --hl XX` (ISO codes) |

**Rule of thumb:** If the query string contains non-English words, set `--gl` and `--hl` to match that language.

---

## How to Invoke

```bash
python3 scripts/search.py -q "QUERY" [--mode MODE] [--gl COUNTRY] [--hl LANG]
```

### Examples

```bash
# English, general research
python3 scripts/search.py -q "how does HTTPS work"

# English, time-sensitive
python3 scripts/search.py -q "OpenAI latest announcements" --mode current

# German query — set locale + current mode for news/prices
python3 scripts/search.py -q "aktuelle Preise iPhone" --mode current --gl de --hl de

# German news
python3 scripts/search.py -q "Nachrichten aus Berlin" --mode current --gl de --hl de

# French product research
python3 scripts/search.py -q "meilleur smartphone 2026" --gl fr --hl fr

```

---

## Output Format

The output is **clean JSON only** — no log lines, no markers. Two types of JSON objects are printed, one per line:

**First line — search results** (printed immediately after API call):
```json
{"query": "...", "mode": "default", "locale": {"gl": "world", "hl": "en"}, "results": [{"title": "...", "url": "...", "source": "web"}, ...]}
```

**Following lines — one per page** (printed as each page is scraped):
```json
{"title": "...", "url": "...", "source": "web", "content": "Full extracted page text..."}
{"title": "...", "url": "...", "source": "news", "date": "2 hours ago", "content": "Full article text..."}
```

Result fields:
- `title` — page title
- `url` — source URL
- `source` — `"web"`, `"news"`, or `"knowledge_graph"`
- `content` — full extracted page text (falls back to search snippet if extraction fails)
- `date` — only present for news results

---

## CLI Reference

| Flag | Description |
|------|-------------|
| `-q, --query` | Search query (required) |
| `-m, --mode` | `default` (all-time, 5 results) or `current` (past week + news, 3 each) |
| `--gl` | Country code (e.g. `de`, `us`, `fr`, `at`, `ch`) |
| `--hl` | Language code (e.g. `en`, `de`, `fr`) |
