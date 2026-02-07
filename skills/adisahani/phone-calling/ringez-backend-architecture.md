# Ringez API - Backend Architecture
## Technical Implementation & Database Design

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (Nginx)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
┌───────────▼──────────┐        ┌──────────▼──────────┐
│   API Gateway        │        │   Webhook Service    │
│   (Express/Fastify)  │        │   (Event Processing) │
└───────────┬──────────┘        └──────────┬──────────┘
            │                               │
    ┌───────┴────────┐              ┌──────┴──────┐
    │                │              │             │
┌───▼───┐  ┌────────▼──────┐  ┌────▼────┐  ┌────▼────┐
│Session│  │Call Management│  │Analytics│  │Payment  │
│Service│  │   Service     │  │ Service │  │ Service │
└───┬───┘  └────────┬──────┘  └────┬────┘  └────┬────┘
    │               │               │            │
    └───────────────┴───────────────┴────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    ┌────▼────┐          ┌────▼─────┐
    │ MongoDB │          │  Redis   │
    │Database │          │  Cache   │
    └─────────┘          └──────────┘

External Services:
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Twilio  │  │ PayPal   │  │Cashfree  │  │ Firebase │
│  Voice   │  │          │  │          │  │   Auth   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

---

## 🗄️ Database Schema (MongoDB)

### Collections Overview

1. **users** - User accounts (registered users)
2. **sessions** - Active calling sessions (guest + authenticated)
3. **calls** - Call records
4. **transactions** - Payment and wallet transactions
5. **contacts** - User contact book
6. **webhooks** - Webhook subscriptions
7. **api_keys** - API authentication keys
8. **call_transcripts** - Call transcription data
9. **analytics_events** - Telemetry and analytics
10. **rate_limits** - Rate limiting state

---

### 1. Users Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Identity
  user_id: "usr_abc123xyz",
  email: "user@example.com",
  firebase_uid: "firebase_123",
  
  // Account Info
  account_type: "free" | "standard" | "premium" | "enterprise",
  created_at: ISODate("2026-02-05T12:00:00Z"),
  updated_at: ISODate("2026-02-05T12:00:00Z"),
  last_login: ISODate("2026-02-05T12:00:00Z"),
  
  // Wallet
  wallet: {
    balance_minutes: 120,
    balance_usd: 15.00,
    currency: "USD",
    last_transaction_id: "txn_xyz789"
  },
  
  // Preferences
  preferences: {
    default_caller_id: "+12025551000",
    privacy_mode: true,
    auto_recharge: false,
    auto_recharge_threshold: 10,
    auto_recharge_amount: 30.00,
    preferred_currency: "USD",
    timezone: "America/Los_Angeles"
  },
  
  // Limits
  limits: {
    max_concurrent_calls: 5,
    max_call_duration: 3600,
    daily_spend_limit: 50.00
  },
  
  // Metadata
  metadata: {
    country: "US",
    registration_ip: "203.0.113.1",
    user_agent: "Mozilla/5.0..."
  },
  
  // Status
  status: "active" | "suspended" | "deleted",
  email_verified: true,
  phone_verified: false
}

// Indexes
db.users.createIndex({ "user_id": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "firebase_uid": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "status": 1, "created_at": -1 });
```

---

### 2. Sessions Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Session Identity
  session_id: "sess_abc123xyz",
  session_token: "tk_secure_random_string",
  session_type: "guest" | "authenticated",
  
  // User Reference
  user_id: "usr_abc123xyz", // null for guest sessions
  
  // Agent Context
  agent_context: {
    agent_id: "agent_123",
    agent_name: "CustomerSupportBot",
    agent_version: "1.0",
    capabilities: ["voice_calling", "transcription"]
  },
  
  // Session Wallet (for guest sessions)
  wallet: {
    balance_minutes: 30,
    balance_usd: 5.00,
    currency: "USD"
  },
  
  // Consent & Settings
  user_consent: {
    calling_authorized: true,
    privacy_mode: true,
    max_spend_limit: 10.00,
    data_retention: "session_only" | "30_days" | "permanent"
  },
  
  // Session Metadata
  created_at: ISODate("2026-02-05T12:00:00Z"),
  expires_at: ISODate("2026-02-05T18:00:00Z"),
  last_activity: ISODate("2026-02-05T12:30:00Z"),
  
  // Usage Stats
  stats: {
    calls_made: 3,
    total_duration: 300,
    total_spent: 2.50
  },
  
  // Session State
  status: "active" | "expired" | "terminated",
  
  // Security
  ip_address: "203.0.113.1",
  user_agent: "RingezSDK/1.0",
  
  // Rate Limiting
  rate_limits: {
    calls_per_hour: 20,
    max_call_duration: 3600
  }
}

// Indexes
db.sessions.createIndex({ "session_id": 1 }, { unique: true });
db.sessions.createIndex({ "session_token": 1 });
db.sessions.createIndex({ "user_id": 1, "status": 1 });
db.sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ "agent_context.agent_id": 1 });
```

---

### 3. Calls Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Call Identity
  call_id: "call_xyz789",
  
  // Session & User
  session_id: "sess_abc123xyz",
  user_id: "usr_abc123xyz", // null for guest
  
  // Call Details
  to_number: "+14155551234",
  to_number_formatted: "(415) 555-1234",
  to_country: "US",
  to_carrier: "AT&T Mobility",
  to_type: "mobile" | "landline",
  
  from_number: "+12025551000",
  
  // Privacy
  privacy_mode: true,
  caller_id_name: "Anonymous" | "Custom Name",
  
  // Call Timeline
  initiated_at: ISODate("2026-02-05T12:30:00Z"),
  ringing_at: ISODate("2026-02-05T12:30:15Z"),
  answered_at: ISODate("2026-02-05T12:30:30Z"),
  ended_at: ISODate("2026-02-05T12:34:20Z"),
  
  // Call Status
  status: "initiated" | "ringing" | "answered" | "in-progress" | "completed" | "failed" | "busy" | "no-answer",
  end_reason: "normal" | "caller_hangup" | "callee_hangup" | "failed" | "timeout",
  
  // Duration & Billing
  duration_seconds: 230,
  billable_minutes: 4, // Rounded up
  rate_per_minute: 0.125,
  cost: {
    amount: 0.50,
    currency: "USD"
  },
  
  // Quality Metrics
  quality_metrics: {
    mos_score: 4.2, // Mean Opinion Score
    latency_ms: 85,
    jitter_ms: 12,
    packet_loss: 0.02,
    codec: "OPUS"
  },
  
  // Features
  features: {
    recording_enabled: false,
    recording_url: null,
    transcription_enabled: true,
    transcription_id: "trans_abc123"
  },
  
  // Twilio Details
  twilio: {
    call_sid: "CAxxxxxxxxxxxxx",
    parent_call_sid: null, // For transfers
    direction: "outbound-api"
  },
  
  // Metadata
  metadata: {
    purpose: "customer_support",
    ticket_id: "TKT-12345",
    tags: ["support", "priority"]
  },
  
  // Actions History
  actions: [
    {
      action: "dtmf",
      parameters: { digits: "1234#" },
      timestamp: ISODate("2026-02-05T12:32:00Z")
    },
    {
      action: "hold",
      timestamp: ISODate("2026-02-05T12:33:00Z")
    }
  ]
}

// Indexes
db.calls.createIndex({ "call_id": 1 }, { unique: true });
db.calls.createIndex({ "session_id": 1, "initiated_at": -1 });
db.calls.createIndex({ "user_id": 1, "initiated_at": -1 });
db.calls.createIndex({ "status": 1, "initiated_at": -1 });
db.calls.createIndex({ "to_number": 1 });
db.calls.createIndex({ "twilio.call_sid": 1 });
db.calls.createIndex({ "initiated_at": -1 });
```

---

### 4. Transactions Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Transaction Identity
  transaction_id: "txn_abc123xyz",
  idempotency_key: "unique_transaction_id",
  
  // User & Session
  user_id: "usr_abc123xyz",
  session_id: "sess_abc123xyz",
  
  // Transaction Type
  type: "credit" | "debit" | "refund" | "adjustment",
  category: "wallet_topup" | "call_charge" | "admin_adjustment",
  
  // Amount
  amount: {
    value: 15.00,
    currency: "USD",
    minutes: 120 // For credit transactions
  },
  
  // Payment Details
  payment: {
    method: "paypal" | "cashfree" | "stripe" | "admin",
    provider_transaction_id: "PAY-XXXXXXXXXXXX",
    plan: "popular",
    
    // PayPal specific
    paypal_order_id: "ORDER-123",
    paypal_payer_id: "PAYER-456",
    
    // Cashfree specific
    cashfree_order_id: "cf_order_123",
    cashfree_payment_id: "cf_payment_456"
  },
  
  // Balance Update
  balance_before: {
    minutes: 25,
    value: 4.17
  },
  balance_after: {
    minutes: 145,
    value: 19.17
  },
  
  // Transaction Status
  status: "pending" | "completed" | "failed" | "refunded",
  
  // Related Entity (for debits)
  related_call_id: "call_xyz789",
  
  // Timestamps
  created_at: ISODate("2026-02-05T12:15:00Z"),
  completed_at: ISODate("2026-02-05T12:15:05Z"),
  
  // Receipt
  receipt_url: "https://ringez.com/receipts/txn_abc123",
  
  // Metadata
  metadata: {
    ip_address: "203.0.113.1",
    user_agent: "RingezSDK/1.0"
  },
  
  // Error info (for failed transactions)
  error: {
    code: "insufficient_funds",
    message: "Payment method declined"
  }
}

// Indexes
db.transactions.createIndex({ "transaction_id": 1 }, { unique: true });
db.transactions.createIndex({ "idempotency_key": 1 }, { unique: true, sparse: true });
db.transactions.createIndex({ "user_id": 1, "created_at": -1 });
db.transactions.createIndex({ "session_id": 1, "created_at": -1 });
db.transactions.createIndex({ "status": 1, "created_at": -1 });
db.transactions.createIndex({ "payment.provider_transaction_id": 1 });
db.transactions.createIndex({ "related_call_id": 1 });
```

---

### 5. Contacts Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Contact Identity
  contact_id: "cnt_abc123xyz",
  
  // Ownership
  user_id: "usr_abc123xyz",
  session_id: "sess_abc123xyz", // For guest sessions
  
  // Contact Info
  name: "John Doe",
  phone_number: "+14155551234",
  phone_number_formatted: "(415) 555-1234",
  
  // Organization
  labels: ["customer", "priority", "vip"],
  notes: "Main contact for ABC Corp",
  
  // Extended Info
  metadata: {
    company: "ABC Corp",
    department: "Sales",
    title: "VP of Sales",
    email: "john@abccorp.com"
  },
  
  // Statistics
  stats: {
    total_calls: 15,
    last_called: ISODate("2026-02-05T12:30:00Z"),
    first_called: ISODate("2026-01-15T10:00:00Z"),
    total_duration: 3600,
    average_duration: 240
  },
  
  // Timestamps
  created_at: ISODate("2026-01-15T10:00:00Z"),
  updated_at: ISODate("2026-02-05T12:35:00Z")
}

// Indexes
db.contacts.createIndex({ "contact_id": 1 }, { unique: true });
db.contacts.createIndex({ "user_id": 1, "created_at": -1 });
db.contacts.createIndex({ "session_id": 1 });
db.contacts.createIndex({ "phone_number": 1 });
db.contacts.createIndex({ "labels": 1 });
db.contacts.createIndex({ "name": "text" }); // Text search
```

---

### 6. Webhooks Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Webhook Identity
  webhook_id: "wh_abc123xyz",
  
  // Ownership
  user_id: "usr_abc123xyz",
  session_id: "sess_abc123xyz",
  
  // Configuration
  webhook_url: "https://agent.example.com/webhooks/ringez",
  events: [
    "call.initiated",
    "call.answered",
    "call.completed",
    "transcription.updated"
  ],
  
  // Security
  secret: "whsec_random_secret_key",
  
  // Status
  status: "active" | "paused" | "disabled",
  
  // Delivery Stats
  stats: {
    total_attempts: 450,
    successful_deliveries: 445,
    failed_deliveries: 5,
    last_delivery_at: ISODate("2026-02-05T12:34:20Z"),
    last_failure_at: ISODate("2026-02-04T15:20:00Z")
  },
  
  // Retry Configuration
  retry_config: {
    max_retries: 3,
    retry_delays: [60, 300, 900] // seconds
  },
  
  // Timestamps
  created_at: ISODate("2026-02-05T12:40:00Z"),
  updated_at: ISODate("2026-02-05T12:40:00Z")
}

// Indexes
db.webhooks.createIndex({ "webhook_id": 1 }, { unique: true });
db.webhooks.createIndex({ "user_id": 1, "status": 1 });
db.webhooks.createIndex({ "session_id": 1 });
db.webhooks.createIndex({ "events": 1 });
```

---

### 7. API Keys Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Key Identity
  key_id: "key_abc123xyz",
  api_key: "sk_live_xxxxxxxxxxxxxxxxxx", // Hashed
  api_key_prefix: "sk_live_xxxxx", // First 12 chars for display
  
  // Ownership
  user_id: "usr_abc123xyz",
  
  // Key Type
  type: "live" | "test",
  environment: "production" | "sandbox",
  
  // Permissions
  permissions: [
    "calls:create",
    "calls:read",
    "wallet:read",
    "wallet:write",
    "webhooks:manage"
  ],
  
  // Restrictions
  restrictions: {
    allowed_ips: ["203.0.113.0/24"],
    rate_limit_tier: "standard",
    max_concurrent_calls: 10
  },
  
  // Usage Stats
  stats: {
    total_requests: 15000,
    last_used_at: ISODate("2026-02-05T12:30:00Z"),
    first_used_at: ISODate("2026-01-01T00:00:00Z")
  },
  
  // Status
  status: "active" | "revoked" | "expired",
  
  // Metadata
  name: "Production API Key",
  description: "Main API key for production app",
  
  // Timestamps
  created_at: ISODate("2026-01-01T00:00:00Z"),
  expires_at: null, // null = never expires
  last_rotated_at: ISODate("2026-01-01T00:00:00Z"),
  revoked_at: null
}

// Indexes
db.api_keys.createIndex({ "key_id": 1 }, { unique: true });
db.api_keys.createIndex({ "api_key": 1 }, { unique: true }); // Hashed key
db.api_keys.createIndex({ "user_id": 1, "status": 1 });
db.api_keys.createIndex({ "status": 1 });
db.api_keys.createIndex({ "expires_at": 1 });
```

---

### 8. Call Transcripts Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Transcript Identity
  transcription_id: "trans_abc123xyz",
  call_id: "call_xyz789",
  
  // User & Session
  user_id: "usr_abc123xyz",
  session_id: "sess_abc123xyz",
  
  // Transcript Data
  transcript: [
    {
      speaker: "caller" | "recipient",
      text: "Hello, is this customer service?",
      timestamp: 2.5, // seconds from call start
      confidence: 0.98,
      start_time: 2.5,
      end_time: 4.8
    },
    {
      speaker: "recipient",
      text: "Yes, how can I help you today?",
      timestamp: 5.2,
      confidence: 0.95,
      start_time: 5.2,
      end_time: 7.5
    }
  ],
  
  // Configuration
  language: "en-US",
  speaker_labels_enabled: true,
  
  // Processing Status
  status: "processing" | "completed" | "failed",
  
  // Downloads
  download_url: "https://ringez.com/transcripts/trans_abc123.json",
  txt_url: "https://ringez.com/transcripts/trans_abc123.txt",
  
  // Timestamps
  created_at: ISODate("2026-02-05T12:30:30Z"),
  completed_at: ISODate("2026-02-05T12:34:25Z"),
  
  // Metadata
  total_duration: 230,
  word_count: 450,
  
  // Expiration (privacy)
  expires_at: ISODate("2026-03-05T12:34:25Z") // 30 days retention
}

// Indexes
db.call_transcripts.createIndex({ "transcription_id": 1 }, { unique: true });
db.call_transcripts.createIndex({ "call_id": 1 });
db.call_transcripts.createIndex({ "user_id": 1, "created_at": -1 });
db.call_transcripts.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.call_transcripts.createIndex({ "transcript.text": "text" }); // Full-text search
```

---

### 9. Analytics Events Collection

```javascript
{
  _id: ObjectId("..."),
  
  // Event Identity
  event_id: "evt_abc123xyz",
  event_type: "call.quality_degraded" | "balance.low" | "rate_limit.hit",
  
  // Context
  user_id: "usr_abc123xyz",
  session_id: "sess_abc123xyz",
  call_id: "call_xyz789",
  
  // Event Data
  data: {
    // Flexible schema based on event type
    mos_score: 2.8,
    threshold: 3.5,
    action_taken: "codec_switch"
  },
  
  // Metadata
  metadata: {
    ip_address: "203.0.113.1",
    user_agent: "RingezSDK/1.0",
    sdk_version: "1.2.3"
  },
  
  // Timestamp
  timestamp: ISODate("2026-02-05T12:32:00Z"),
  
  // TTL for analytics data
  expires_at: ISODate("2026-05-05T12:32:00Z") // 90 days retention
}

// Indexes
db.analytics_events.createIndex({ "event_id": 1 }, { unique: true });
db.analytics_events.createIndex({ "event_type": 1, "timestamp": -1 });
db.analytics_events.createIndex({ "user_id": 1, "timestamp": -1 });
db.analytics_events.createIndex({ "call_id": 1 });
db.analytics_events.createIndex({ "timestamp": -1 });
db.analytics_events.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
```

---

### 10. Rate Limits Collection (Redis Alternative)

```javascript
{
  _id: ObjectId("..."),
  
  // Rate Limit Key
  key: "api_key:sk_live_abc123:calls:hourly",
  
  // Counter
  count: 47,
  limit: 100,
  
  // Window
  window_start: ISODate("2026-02-05T12:00:00Z"),
  window_end: ISODate("2026-02-05T13:00:00Z"),
  
  // TTL
  expires_at: ISODate("2026-02-05T13:00:00Z")
}

// Indexes
db.rate_limits.createIndex({ "key": 1, "window_start": 1 });
db.rate_limits.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
```

---

## 🔐 Security Implementations

### API Key Hashing (bcrypt)
```javascript
const bcrypt = require('bcrypt');

async function hashApiKey(apiKey) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(apiKey, salt);
}

async function verifyApiKey(apiKey, hashedKey) {
  return bcrypt.compare(apiKey, hashedKey);
}
```

### Webhook Signature Verification
```javascript
const crypto = require('crypto');

function generateWebhookSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

function verifyWebhookSignature(payload, signature, secret) {
  const expected = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## 📊 Aggregation Pipelines

### Monthly Revenue Report
```javascript
db.transactions.aggregate([
  {
    $match: {
      type: "credit",
      status: "completed",
      created_at: {
        $gte: ISODate("2026-02-01T00:00:00Z"),
        $lt: ISODate("2026-03-01T00:00:00Z")
      }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$created_at" }
      },
      total_revenue: { $sum: "$amount.value" },
      transaction_count: { $sum: 1 },
      avg_transaction: { $avg: "$amount.value" }
    }
  },
  {
    $sort: { _id: 1 }
  }
]);
```

### Call Quality Metrics
```javascript
db.calls.aggregate([
  {
    $match: {
      status: "completed",
      "quality_metrics.mos_score": { $exists: true }
    }
  },
  {
    $group: {
      _id: null,
      avg_mos: { $avg: "$quality_metrics.mos_score" },
      avg_latency: { $avg: "$quality_metrics.latency_ms" },
      avg_packet_loss: { $avg: "$quality_metrics.packet_loss" },
      total_calls: { $sum: 1 }
    }
  }
]);
```

---

## 🚀 Performance Optimizations

### 1. Connection Pooling
```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ringez', {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 2. Read Preferences
```javascript
// For analytics/reporting (use secondary)
db.calls.find().readPref('secondary');

// For critical operations (use primary)
db.transactions.find().readPref('primary');
```

### 3. Caching Strategy (Redis)
```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUserBalance(userId) {
  const cacheKey = `balance:${userId}`;
  
  // Try cache first
  let balance = await client.get(cacheKey);
  
  if (!balance) {
    // Fetch from database
    const user = await db.users.findOne({ user_id: userId });
    balance = user.wallet;
    
    // Cache for 5 minutes
    await client.setex(cacheKey, 300, JSON.stringify(balance));
  } else {
    balance = JSON.parse(balance);
  }
  
  return balance;
}
```

---

## 📝 Data Retention Policies

```javascript
// Call transcripts - 30 days
db.call_transcripts.createIndex(
  { "created_at": 1 },
  { expireAfterSeconds: 2592000 } // 30 days
);

// Guest sessions - 6 hours
db.sessions.createIndex(
  { "expires_at": 1 },
  { expireAfterSeconds: 0 }
);

// Analytics events - 90 days
db.analytics_events.createIndex(
  { "created_at": 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

// Privacy mode calls - delete after completion
async function handleCallCompletion(callId) {
  const call = await db.calls.findOne({ call_id: callId });
  
  if (call.privacy_mode) {
    // Delete call record
    await db.calls.deleteOne({ call_id: callId });
    
    // Delete transcript
    await db.call_transcripts.deleteOne({ call_id: callId });
    
    // Delete related events
    await db.analytics_events.deleteMany({ call_id: callId });
  }
}
```

---

*This architecture supports high-throughput, low-latency voice calling with robust analytics and privacy controls.*
