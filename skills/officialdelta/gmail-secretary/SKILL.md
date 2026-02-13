---
name: gmail-secretary
description: Gmail triage assistant: label by priority/topic, maintain Alan's "voice" reference from Sent mail, and draft replies for approval (uses gog CLI; never auto-sends).
---

# Gmail Secretary (Alan)

## Safety rules (non-negotiable)
- **Never send email automatically.** Only create drafts + summaries.
- Prefer **labels** over moving/deleting.
- Keep the voice reference **style-focused** (patterns + a few short redacted snippets), not a full archive.

## Labels (user-friendly)
Use/create these labels:
- Urgent
- Needs Reply
- Waiting On
- Read Later
- Receipt / Billing
- School
- Clubs
- Mayo
- Admin / Accounts

## Files
- Voice reference (auto-maintained): `references/voice.md`
- Draft queue (generated): `/home/delta/.openclaw/workspace/cache/gmail-drafts.md`
- Triage digest (generated): `/home/delta/.openclaw/workspace/cache/gmail-triage.md`

## Scripts
- Build/refresh voice reference from Sent mail:
  - `scripts/build-voice-reference.sh` (samples last 50 sent messages)
- Triage inbox + apply labels + create draft suggestions:
  - `scripts/triage-and-draft.sh`

## Workflow
1) Run build-voice-reference daily.
2) Run triage-and-draft before nudges.
3) Nudges should read `gmail-triage.md` (not raw Gmail).