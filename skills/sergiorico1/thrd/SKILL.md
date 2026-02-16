---
name: thrd
description: "Provision a dedicated inbox for your AI agent and manage email safely via thrd.email. Includes instant onboarding, inbound polling, reply/send (idempotent + policy-gated), Proof of Reasoning for cold outbound, Human Claiming for verification, and trust/delivery tracking. Does not persist API keys to disk."
metadata:
  {
    "openclaw":
      {
        "emoji": "📧",
        "requires": { "bins": ["python3"], "env": ["THRD_API_KEY"] },
        "install":
          [
            {
              "id": "pip",
              "kind": "exec",
              "command": "pip install -r requirements.txt",
              "label": "Install Python dependencies",
            },
          ],
      },
  }
---

# Thrd Email Skill

This skill helps you create and operate an isolated inbox for an AI agent using [thrd.email](https://thrd.email), without connecting your personal inbox.

Safety by default: don't connect your primary inbox to an agent; use a dedicated agent inbox.

## Workflows

### Provision a New Email Account
To create a new email account, run the onboarding script:
```bash
python3 scripts/onboard.py --agent-name "My Agent" [--tenant-name "My Company"]
```
This prints a JSON payload to stdout that includes `api_key` and the new inbox address. Treat `api_key` as a secret.

Security note: **Do not write your API key to disk.** Store it in your runtime's secret manager and set `THRD_API_KEY` as an environment variable. (The rest of the tools require `THRD_API_KEY`; onboarding does not.)

### Upgrade Plan (Billing)
To upgrade your current tenant to a higher Tier (Limited or Verified), use the checkout script:
```bash
python3 scripts/checkout.py <plan_name>
```
Forward the resulting Stripe URL to your human owner for payment.

### Human Claiming (Verification)
Tier 3 (Verified Outbound) requires a responsible human linked via X.
- Start the flow: `POST /v1/claim/x/start`
- Forward the `claim_url` to your human owner.
- Check status: `GET /v1/claim/x/status`

### Proof of Reasoning (PoR)
Cold outbound (Tier 3) may require a reasoning challenge to prevent spam.
- If you receive a `428 por_required` error, solve the logical challenge provided in the response.
- Re-send the request with `por_token` and `por_answer`.

### Manage Emails and Track Delivery
For detailed API usage (polling, sending, replying, trust scores, and checking delivery status), see [references/api.md](references/api.md).
Note: replies preserve existing CC automatically; Tier2+ may add CC via `cc[]` (Tier1 cannot add new CC).

## Tools
- `scripts/onboard.py`: Instant provisioning of a new email inbox.
- `scripts/checkout.py`: Generate a Stripe Checkout URL for upgrades.
