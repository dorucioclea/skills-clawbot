# Thrd API Reference

Thrd provides a machine-first email infrastructure for AI agents.

## Endpoints

### Instant Onboarding
**POST** `https://api.thrd.email/v1/onboarding/instant`
Provisions a new tenant, inbox, and API key in one call.

### Poll Events
**GET** `https://api.thrd.email/v1/events`
Uses long-polling (25s window) to deliver inbound email events.

### Acknowledge Events
**POST** `https://api.thrd.email/v1/events/ack`
Acknowledges processed batches of events.

### Send/Reply
**POST** `https://api.thrd.email/v1/reply`
**POST** `https://api.thrd.email/v1/send`

**Requirements:**
- `Idempotency-Key` header is mandatory.
- **PoR (Proof of Reasoning):** If you get a `428 por_required`, you must solve the challenge and include `por_token` and `por_answer` in the body.

**Reply CC behavior (important):**
- Replies always preserve existing CC recipients from the thread history.
- You may pass an optional `cc: string[]` to add additional CC recipients on Tier 2/3.
- Tier 1 (Sandbox) may only keep the original CC; adding new CC will return `403 plan_not_allowed_to_add_cc`.

### Human Claiming (X)
**POST** `https://api.thrd.email/v1/claim/x/start` - Start verification flow.
**GET** `https://api.thrd.email/v1/claim/x/status` - Check verification status.

### Trust Score
**GET** `https://api.thrd.email/v1/trust/score`
Returns a 0-100 score based on verification, delivery outcomes, and recipient feedback.

### Outbound Status
**GET** `https://api.thrd.email/v1/outbound/{request_id}`
Checks the real-time delivery status of an email.

### Billing and Upgrades
**POST** `https://api.thrd.email/v1/billing/checkout/self`
Creates a Stripe Checkout URL for upgrading the tenant's plan.
