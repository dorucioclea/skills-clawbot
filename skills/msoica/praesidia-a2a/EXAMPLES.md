# A2A Protocol Skill - Examples

Real-world examples of using the A2A skill in OpenClaw conversations.

---

## Example 1: Get OAuth Token

**User:**
```
Get an access token for my agent with message and task scopes
```

**OpenClaw (using this skill):**

Calls:
```javascript
POST ${PRAESIDIA_API_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=${AGENT_CLIENT_ID}
&client_secret=${AGENT_CLIENT_SECRET}
&scope=a2a:message a2a:task
```

**Response to user:**
```
✅ Access token obtained successfully!

Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZ2VudC0xMjMi...
Type: Bearer
Expires in: 3600 seconds (1 hour)
Scopes: a2a:message, a2a:task

Use in requests:
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Example 2: Send Message to Another Agent

**User:**
```
Send "Analyze this CSV data: revenue,2024,1000000" to the data analyzer agent at https://analyzer.example.com
```

**OpenClaw (using this skill):**

Step 1: Get token (if not cached)
```javascript
POST ${PRAESIDIA_API_URL}/oauth/token
// ... get access_token
```

Step 2: Fetch agent card
```javascript
GET https://analyzer.example.com/.well-known/agent-card.json
```

Step 3: Send message
```javascript
POST https://analyzer.example.com/a2a
Authorization: Bearer ${access_token}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "req-456",
  "method": "message/send",
  "params": {
    "message": {
      "messageId": "msg-789",
      "role": "user",
      "kind": "message",
      "parts": [
        {
          "kind": "text",
          "text": "Analyze this CSV data: revenue,2024,1000000"
        }
      ]
    }
  }
}
```

**Response to user:**
```
✅ Message sent to Data Analyzer Agent

Response received:
---
Based on the CSV data provided:
- Revenue for 2024: $1,000,000
- This represents a single data point
- Recommendation: Provide more historical data for trend analysis

Would you like me to generate a chart or more detailed report?
---

Task ID: task-abc-123
Status: COMPLETED
```

---

## Example 3: Verify Trust Before Calling

**User:**
```
Before calling agent xyz-789, check if it's trustworthy
```

**OpenClaw (using this skill):**

Calls:
```javascript
GET ${PRAESIDIA_API_URL}/agents/xyz-789/trust
Authorization: Bearer ${PRAESIDIA_API_KEY}
```

**Response to user:**
```
🛡️ Trust Verification for Agent xyz-789

Trust Score: 45.5 / 100
Trust Level: LIMITED ⚠️

Trust Components:
- Identity Verification: 60/100 (Basic verification completed)
- Behavioral Trust: 40/100 (Limited interaction history)
- Security Posture: 50/100 (Some security measures in place)
- Compliance: 30/100 (No compliance certifications)

⚠️ RECOMMENDATION: Use with caution
This agent has a LIMITED trust level. Consider:
1. Only sending non-sensitive data
2. Manually reviewing responses
3. Setting up guardrails for interactions
4. Contacting agent owner for verification

Would you still like to proceed with the call?
```

---

## Example 4: Token Exchange for Delegation

**User:**
```
I need to call the file processor agent on behalf of my main agent. Get me the right token.
```

**OpenClaw (using this skill):**

Step 1: Get base token (if not cached)
```javascript
POST ${PRAESIDIA_API_URL}/oauth/token
// grant_type=client_credentials
// Returns: subject_token
```

Step 2: Exchange token
```javascript
POST ${PRAESIDIA_API_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=${current_token}
&subject_token_type=urn:ietf:params:oauth:token-type:access_token
&requested_token_type=urn:ietf:params:oauth:token-type:access_token
&audience=https://file-processor.example.com
&scope=a2a:message
```

**Response to user:**
```
✅ Token exchanged successfully!

Exchanged Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOi...
Audience: https://file-processor.example.com
Issued for: agent-123 (your main agent)
Scopes: a2a:message
Expires in: 3600 seconds

This token is scoped specifically for calling the file processor agent.
The file processor will see that the request comes from agent-123 (your agent).

Use it like this:
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Example 5: Fetch and Parse Agent Card

**User:**
```
What can the agent at https://support-bot.example.com do?
```

**OpenClaw (using this skill):**

Calls:
```javascript
GET https://support-bot.example.com/.well-known/agent-card.json
```

**Response to user:**
```
📋 Agent Card: Customer Support Bot

**Basic Info:**
- Name: Customer Support Bot
- Description: 24/7 customer support with ticket management
- Version: 2.1.0
- URL: https://support-bot.example.com

**Capabilities:**
✅ Streaming responses
✅ Push notifications
✅ State transition history
❌ File attachments

**Skills:**
1. ticket:create - Create support tickets
2. ticket:update - Update ticket status
3. knowledge:search - Search knowledge base
4. chat:general - General conversation

**Input Modes:**
- text/plain
- application/json

**Output Modes:**
- text/plain
- text/markdown
- application/json

**OAuth Endpoints:**
- Token: https://support-bot.example.com/oauth/token
- JWKS: https://support-bot.example.com/.well-known/jwks.json

**Contact:**
- Email: support@example.com
- Docs: https://docs.example.com/support-bot

This agent is ready to receive A2A messages at:
https://support-bot.example.com/a2a
```

---

## Example 6: Set Up OAuth Provider

**User:**
```
I want to make my agent an OAuth provider so other agents can authenticate. How do I set this up?
```

**OpenClaw (using this skill):**

**Response to user:**
```
🔐 Setting Up OAuth Provider for Your Agent

To make your agent an OAuth 2.0/OIDC provider, implement these 3 endpoints:

---

### 1. Token Endpoint
**POST /oauth/token**

Handles token requests. Example implementation:

```javascript
app.post('/oauth/token', async (req, res) => {
  const { grant_type, client_id, client_secret, scope } = req.body;
  
  // Validate client credentials
  const agent = await db.agents.findByClientId(client_id);
  if (!agent || !await validateSecret(client_id, client_secret)) {
    return res.status(401).json({ error: 'invalid_client' });
  }
  
  // Generate JWT
  const token = await generateJWT({
    sub: agent.id,
    client_id: client_id,
    scope: scope || 'a2a:message',
    iss: 'https://your-agent.example.com',
    aud: 'https://your-agent.example.com',
    exp: Math.floor(Date.now() / 1000) + 3600
  });
  
  res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: scope || 'a2a:message'
  });
});
```

---

### 2. JWKS Endpoint
**GET /.well-known/jwks.json**

Exposes public keys for token verification:

```javascript
app.get('/.well-known/jwks.json', (req, res) => {
  res.json({
    keys: [
      {
        kty: 'RSA',
        kid: 'key-1',
        use: 'sig',
        alg: 'RS256',
        n: '...',  // RSA public key modulus
        e: 'AQAB'  // RSA public exponent
      }
    ]
  });
});
```

---

### 3. OIDC Discovery Endpoint
**GET /.well-known/openid-configuration**

Advertises your OAuth capabilities:

```javascript
app.get('/.well-known/openid-configuration', (req, res) => {
  res.json({
    issuer: 'https://your-agent.example.com',
    token_endpoint: 'https://your-agent.example.com/oauth/token',
    jwks_uri: 'https://your-agent.example.com/.well-known/jwks.json',
    grant_types_supported: [
      'client_credentials',
      'urn:ietf:params:oauth:grant-type:token-exchange'
    ],
    response_types_supported: ['token'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    scopes_supported: [
      'a2a:message',
      'a2a:task',
      'a2a:stream',
      'a2a:push'
    ]
  });
});
```

---

**Next Steps:**
1. Generate RSA key pair for JWT signing
2. Implement the 3 endpoints above
3. Store client credentials securely
4. Test token generation with Postman or curl
5. Update your agent card with OAuth endpoints

Would you like help with any specific part?
```

---

## Example 7: Validate Incoming Token

**User:**
```
Someone is calling my agent with this token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...
Is it valid?
```

**OpenClaw (using this skill):**

Calls:
```javascript
POST ${PRAESIDIA_API_URL}/oauth/introspect
Authorization: Bearer ${PRAESIDIA_API_KEY}
Content-Type: application/x-www-form-urlencoded

token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...
```

**Response to user:**
```
✅ Token is VALID

Token Details:
- Active: Yes
- Client ID: agent-456
- Agent ID: agent-456
- Organization: org-789
- Scopes: a2a:message, a2a:task
- Trust Level: VERIFIED

Issued: 2026-02-05 10:30:00 UTC
Expires: 2026-02-05 11:30:00 UTC (in 45 minutes)

Subject: agent-456
Audience: https://your-agent.example.com

✅ You can safely process requests from this token.

The caller is:
- Agent Name: Data Processing Agent
- Organization: Example Corp
- Trust Score: 85/100 (VERIFIED)
```

---

## Example 8: Set Up Middleware Pipeline

**User:**
```
Configure middleware for my A2A server with authentication, trust verification, and audit logging
```

**OpenClaw (using this skill):**

**Response to user:**
```
🛡️ A2A Middleware Pipeline Configuration

Here's a complete middleware setup for your A2A server:

---

### Middleware Configuration

```javascript
const middlewareConfig = {
  // 1. Authentication
  authentication: {
    enabled: true,
    supportedSchemes: ['bearer', 'praesidia'],
    tokenValidationEndpoint: '${PRAESIDIA_API_URL}/oauth/introspect',
    cacheValidatedTokens: true,
    cacheTtl: 300 // 5 minutes
  },
  
  // 2. Authorization
  authorization: {
    enabled: true,
    defaultAllow: false,
    requiredScopes: ['a2a:message'],
    scopesByEndpoint: {
      '/a2a': ['a2a:message'],
      '/a2a/tasks/:id': ['a2a:task'],
      '/a2a/admin': ['a2a:admin']
    }
  },
  
  // 3. Trust Verification
  trustVerification: {
    enabled: true,
    minimumTrustLevel: 'STANDARD',
    trustScoreLookup: async (agentId) => {
      const response = await fetch(
        `${PRAESIDIA_API_URL}/agents/${agentId}/trust`,
        {
          headers: {
            'Authorization': `Bearer ${PRAESIDIA_API_KEY}`
          }
        }
      );
      return await response.json();
    },
    cacheTrustScores: true,
    cacheTtl: 3600 // 1 hour
  },
  
  // 4. Audit Logging
  auditLogging: {
    enabled: true,
    logActions: [
      'MESSAGE_SENT',
      'MESSAGE_RECEIVED',
      'AUTH_SUCCESS',
      'AUTH_FAILURE',
      'TRUST_VERIFICATION_FAILED'
    ],
    logSink: async (entry) => {
      // Send to your logging service
      console.log('Audit:', entry);
      await db.auditLogs.create(entry);
    },
    includeRequestBody: true,
    includeResponseBody: false,
    sanitize: true // Remove sensitive data
  }
};
```

---

### Express Integration

```javascript
import express from 'express';
import { createMiddlewarePipeline } from '@praesidia/a2a/middleware';

const app = express();
const pipeline = createMiddlewarePipeline(middlewareConfig);

// Apply middleware to A2A endpoints
app.use('/a2a', pipeline.toExpress(), (req, res) => {
  // At this point:
  // - Token is validated
  // - Scopes are checked
  // - Trust is verified
  // - Request is logged
  
  // Access auth context
  const { agentId, scopes, trustScore } = req.auth;
  
  // Process A2A request
  const message = req.body.params.message;
  const response = processMessage(message);
  
  res.json({
    jsonrpc: '2.0',
    id: req.body.id,
    result: { message: response }
  });
});

app.listen(3000);
```

---

### Request Flow

```
1. Request arrives → Extract Bearer token
2. Authentication → Validate token via introspection
3. Authorization → Check scopes match endpoint requirements
4. Trust Verification → Verify caller meets minimum trust level
5. Audit Logging → Log request details
6. Your Handler → Process the A2A request
7. Audit Logging → Log response details
8. Response sent → Return to caller
```

---

### What Happens on Failure

**Invalid Token (401):**
```json
{
  "error": "invalid_token",
  "error_description": "Token is expired or malformed"
}
```

**Insufficient Scope (403):**
```json
{
  "error": "insufficient_scope",
  "error_description": "Required scope: a2a:message"
}
```

**Untrusted Agent (403):**
```json
{
  "error": "untrusted_agent",
  "error_description": "Minimum trust level: STANDARD, caller: LIMITED"
}
```

---

Your middleware is now configured! Requests will be:
✅ Authenticated
✅ Authorized
✅ Trust-verified
✅ Audit-logged
```

---

## Example 9: Complete Client-to-Server Flow

**User:**
```
Walk me through calling the file processor agent at https://files.example.com with a file upload request
```

**OpenClaw (using this skill):**

**Response to user:**
```
📤 Complete A2A Client-to-Server Flow

I'll walk you through each step:

---

### Step 1: Get OAuth Token

```bash
POST ${PRAESIDIA_API_URL}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id=${AGENT_CLIENT_ID}
client_secret=${AGENT_CLIENT_SECRET}
scope=a2a:message a2a:task
```

**Result:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "a2a:message a2a:task"
}
```

---

### Step 2: Fetch Target Agent Card

```bash
GET https://files.example.com/.well-known/agent-card.json
```

**Result:**
```json
{
  "name": "File Processor",
  "capabilities": {
    "streaming": true,
    "fileAttachments": true
  },
  "skills": [
    {
      "id": "file:process",
      "name": "Process File"
    }
  ]
}
```

✅ Agent supports file processing!

---

### Step 3: (Optional) Verify Trust

```bash
GET ${PRAESIDIA_API_URL}/agents/file-processor-123/trust
Authorization: Bearer ${PRAESIDIA_API_KEY}
```

**Result:**
```json
{
  "score": 88.5,
  "level": "VERIFIED"
}
```

✅ Trust level is VERIFIED - safe to proceed!

---

### Step 4: Send A2A Message

```bash
POST https://files.example.com/a2a
Authorization: Bearer eyJhbGci... (from Step 1)
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "message/send",
  "params": {
    "message": {
      "messageId": "msg-002",
      "role": "user",
      "kind": "message",
      "parts": [
        {
          "kind": "text",
          "text": "Please process this CSV file"
        },
        {
          "kind": "file_reference",
          "url": "https://my-storage.com/data.csv",
          "mimeType": "text/csv",
          "filename": "data.csv"
        }
      ]
    }
  }
}
```

---

### Step 5: Handle Response

**Immediate Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "task": {
      "taskId": "task-abc-123",
      "status": "WORKING",
      "created": "2026-02-05T10:30:00Z"
    }
  }
}
```

---

### Step 6: (Optional) Stream Updates

```bash
GET https://files.example.com/a2a/stream/task-abc-123
Authorization: Bearer eyJhbGci...
Accept: text/event-stream
```

**Stream Events:**
```
event: status
data: {"status": "WORKING", "progress": 25}

event: status
data: {"status": "WORKING", "progress": 50}

event: message
data: {"kind": "text", "text": "Processing row 1000..."}

event: completed
data: {"status": "COMPLETED", "result": {...}}
```

---

### Summary

✅ Token obtained and authenticated
✅ Agent card fetched and validated
✅ Trust verified (88.5/100 - VERIFIED)
✅ Message sent successfully
✅ Task created: task-abc-123
✅ Updates streamed in real-time

The file processor agent is now working on your request!
```

---

These examples demonstrate the full capabilities of the A2A skill in practical OpenClaw conversations.
