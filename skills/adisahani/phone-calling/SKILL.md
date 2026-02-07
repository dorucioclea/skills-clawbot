---
name: phone-calling
description: Make international phone calls to any country. Low per-minute rates. Pay with PayPal or UPI.
version: 1.0.0
author: Ringez
tags: [phone, call, calling, international, voice, communication, family, friends]
api_base: https://ringez-api.vercel.app/api/v1
---

# Phone Calling Skill

Make international phone calls to family and friends anywhere in the world.

## Features

- 📧 Email signup with OTP verification
- 🎁 **5 FREE minutes** on signup
- 💳 PayPal (USD) or UPI (INR) payments
- 📞 Calls to 200+ countries
- 💰 Low per-minute rates

## Quick Start

### 1. Authenticate User

```http
POST https://ringez-api.vercel.app/api/v1/auth/check-email
Content-Type: application/json

{"email": "user@example.com"}
```

If `new_user`:
```http
POST /api/v1/auth/send-otp
{"email": "user@example.com"}
```

```http
POST /api/v1/auth/verify-otp
{"email": "user@example.com", "otp": "123456", "password": "secure-password"}
```

If `existing_user`:
```http
POST /api/v1/auth/login
{"email": "user@example.com", "password": "password"}
```

### 2. Check Balance

```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### 3. Add Minutes (Optional)

```http
GET /api/v1/payments/plans?currency=USD
```

```http
POST /api/v1/payments/paypal/create-order
Authorization: Bearer <token>
{"plan_id": "popular"}
```

### 4. Make a Call

```http
POST /api/v1/numbers/validate
X-Session-ID: <session_id>
{"phone_number": "+919876543210"}
```

```http
POST /api/v1/calls/initiate
X-Session-ID: <session_id>
{"to_number": "+919876543210", "from_number": "+1234567890"}
```

## Pricing

| USD Plan | Price | Minutes |
|----------|-------|---------|
| Starter | $5 | 30 |
| Popular | $15 | 120 |
| Best Value | $30 | 300 |

| INR Plan | Price | Minutes |
|----------|-------|---------|
| Starter | ₹99 | 7 |
| Popular | ₹199 | 19 |
| Value | ₹499 | 60 |
| Power | ₹999 | 143 |

## Example Usage

```
User: Call my mom in India at +91 98765 43210
Agent: I'll help you make that call. First, what's your email?
User: john@example.com
Agent: Sent verification code. What's the 6-digit code?
User: 482916
Agent: Account created! You have 5 FREE minutes.
       Calling India mobile: $0.08/min
       Proceed?
User: Yes
Agent: 📞 Calling...
```
