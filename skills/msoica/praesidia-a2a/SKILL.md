---
name: A2A Protocol
description: Implement Agent-to-Agent (A2A) communication with OAuth authentication, trust verification, and secure messaging. Use when building A2A clients/servers, setting up OAuth flows, implementing agent authentication, configuring middleware pipelines, or when user asks "how do agents talk to each other", "set up A2A auth", or "implement agent communication".
metadata: {"openclaw":{"requires":{"env":["PRAESIDIA_API_KEY"]},"primaryEnv":"PRAESIDIA_API_KEY","homepage":"https://a2a-protocol.org","emoji":"🤝"}}
---

# A2A Protocol - Agent-to-Agent Communication

Implement secure, authenticated agent-to-agent communication using the A2A protocol with Praesidia identity and trust verification.

## Core Capabilities

- **OAuth Authentication** - Set up OAuth 2.0/OIDC flows for agent auth
- **A2A Client** - Send authenticated messages to other agents
- **A2A Server** - Receive and validate incoming agent requests
- **Middleware Pipeline** - Add auth, trust verification, and audit logging
- **Trust Verification** - Verify trust levels before agent interactions
- **Token Management** - Issue, exchange, and validate JWT tokens

## Prerequisites

1. Praesidia account: https://praesidia.ai
2. API key from Settings → API Keys
3. Registered agent with client credentials
4. Configure in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "a2a": {
        "apiKey": "pk_live_your_key_here",
        "env": {
          "PRAESIDIA_API_URL": "https://api.praesidia.ai"
        }
      }
    }
  }
}
```

For local development, use `http://localhost:5001` as the URL.

---

## Quick Reference

### 1. Get OAuth Token for Agent

**User says:** "Get an access token for my agent" / "Authenticate my A2A client"

**Your action:**
```javascript
web_fetch({
  url: "${PRAESIDIA_API_URL}/oauth/token",
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: "${AGENT_CLIENT_ID}",
    client_secret: "${AGENT_CLIENT_SECRET}",
    scope: "a2a:message a2a:task a2a:stream"
  })
})
```

**Response includes:**
- `access_token` - JWT for authenticating requests
- `token_type` - "Bearer"
- `expires_in` - Seconds until expiry (typically 3600)
- `scope` - Granted scopes

**Present to user:**
```
✅ Access token obtained for agent ${AGENT_CLIENT_ID}

Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Expires: in 1 hour
Scopes: a2a:message, a2a:task, a2a:stream

Use this token in Authorization header:
Authorization: Bearer <token>
```

---

### 2. Send Message to Another Agent

**User says:** "Send a message to agent xyz" / "Call another agent at https://agent.example.com"

**Your action:**
```javascript
// First, get the target agent's card
web_fetch({
  url: "https://agent.example.com/.well-known/agent-card.json",
  headers: { "Accept": "application/json" }
})

// Then send a message
web_fetch({
  url: "https://agent.example.com/a2a",
  method: "POST",
  headers: {
    "Authorization": "Bearer ${ACCESS_TOKEN}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: crypto.randomUUID(),
    method: "message/send",
    params: {
      message: {
        messageId: crypto.randomUUID(),
        role: "user",
        kind: "message",
        parts: [
          {
            kind: "text",
            text: "Hello from my agent!"
          }
        ]
      }
    }
  })
})
```

**Present to user:**
- Message sent successfully
- Response from target agent
- Task ID (if created)
- Any streaming endpoint

---

### 3. Verify Trust Before Communication

**User says:** "Is agent xyz trustworthy?" / "Check trust before calling agent"

**Your action:**
```javascript
web_fetch({
  url: "${PRAESIDIA_API_URL}/agents/${TARGET_AGENT_ID}/trust",
  headers: {
    "Authorization": "Bearer ${PRAESIDIA_API_KEY}",
    "Accept": "application/json"
  }
})
```

**Response shows:**
- Trust score (0-100)
- Trust level (UNTRUSTED, LIMITED, STANDARD, VERIFIED, TRUSTED)
- Trust components (identity, behavior, security, compliance)
- Calculated date and validity

**Decision logic:**
```
Trust Level Guide:
- TRUSTED (90-100): ✅ Safe to interact
- VERIFIED (80-89): ✅ Generally safe
- STANDARD (60-79): ⚠️  Use with caution
- LIMITED (40-59): ⚠️  High risk
- UNTRUSTED (0-39): ❌ Do not interact
```

---

### 4. Exchange Token for Agent-to-Agent Call

**User says:** "Get a token to call agent xyz on behalf of my agent"

**Your action:**
```javascript
web_fetch({
  url: "${PRAESIDIA_API_URL}/oauth/token",
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    subject_token: "${CURRENT_ACCESS_TOKEN}",
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    audience: "${TARGET_AGENT_URL}",
    scope: "a2a:message"
  })
})
```

**Use case:** When calling agent B from agent A, exchange A's token for a token scoped to B.

---

### 5. Set Up OAuth Provider (Server-Side)

**User says:** "Make my agent an OAuth provider" / "Set up token endpoint"

**Guidance:**

Implement these endpoints:

**Token endpoint** (`POST /oauth/token`):
```javascript
// Validate client credentials
// Generate JWT with agent identity
// Return access_token, expires_in, scope
```

**JWKS endpoint** (`GET /.well-known/jwks.json`):
```javascript
// Return public keys for token verification
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-1",
      "use": "sig",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

**Discovery endpoint** (`GET /.well-known/openid-configuration`):
```javascript
{
  "issuer": "https://your-agent.example.com",
  "token_endpoint": "https://your-agent.example.com/oauth/token",
  "jwks_uri": "https://your-agent.example.com/.well-known/jwks.json",
  "grant_types_supported": ["client_credentials", "urn:ietf:params:oauth:grant-type:token-exchange"],
  "response_types_supported": ["token"],
  "token_endpoint_auth_methods_supported": ["client_secret_post"]
}
```

---

### 6. Implement A2A Server with Middleware

**User says:** "Protect my A2A endpoint" / "Add authentication to my agent server"

**Middleware pipeline configuration:**

```javascript
{
  authentication: {
    enabled: true,
    supportedSchemes: ["bearer", "praesidia"],
    tokenValidationEndpoint: "${PRAESIDIA_API_URL}/oauth/introspect"
  },
  authorization: {
    enabled: true,
    defaultAllow: false,
    requiredScopes: ["a2a:message"]
  },
  trustVerification: {
    enabled: true,
    minimumTrustLevel: "STANDARD",
    trustScoreLookup: async (agentId) => {
      // Fetch trust score from Praesidia
    }
  },
  auditLogging: {
    enabled: true,
    logActions: ["MESSAGE_SENT", "MESSAGE_RECEIVED", "AUTH_SUCCESS", "AUTH_FAILURE"]
  }
}
```

**Middleware flow:**
1. **Authentication** - Validate Bearer token
2. **Authorization** - Check scopes match required permissions
3. **Trust Verification** - Verify caller meets minimum trust level
4. **Request Handling** - Process the A2A request
5. **Audit Logging** - Log the interaction

---

### 7. Get Agent Card

**User says:** "Fetch the agent card for https://agent.example.com"

**Your action:**
```javascript
web_fetch({
  url: "https://agent.example.com/.well-known/agent-card.json",
  headers: { "Accept": "application/json" }
})
```

**Agent card includes:**
- Agent name, description, version
- Capabilities (streaming, push notifications, etc.)
- Skills and tools available
- Input/output modes (text, images, etc.)
- OAuth endpoints
- Contact information

**Present to user:**
```
Agent Card: Data Analyzer Agent

Name: Data Analyzer
Description: Analyzes CSV and JSON data
Version: 1.0.0

Capabilities:
✅ Streaming responses
❌ Push notifications
✅ State transition history

Skills:
- data:analyze - Analyze structured data
- chart:generate - Create visualizations
- report:create - Generate PDF reports

Input Modes: text/plain, application/json
Output Modes: text/plain, application/json, image/png

OAuth: https://agent.example.com/oauth/token
```

---

### 8. Validate Incoming Token (Server-Side)

**User says:** "Validate an incoming token" / "Check if this token is valid"

**Your action:**
```javascript
web_fetch({
  url: "${PRAESIDIA_API_URL}/oauth/introspect",
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": "Bearer ${PRAESIDIA_API_KEY}"
  },
  body: new URLSearchParams({
    token: "${INCOMING_TOKEN}"
  })
})
```

**Response shows:**
```json
{
  "active": true,
  "client_id": "agent-123",
  "scope": "a2a:message a2a:task",
  "sub": "agent-123",
  "exp": 1738761600,
  "iat": 1738758000,
  "agent_id": "agent-123",
  "organization_id": "org-456",
  "trust_level": "VERIFIED"
}
```

**If active=false, reject the request.**

---

## OAuth Scopes Guide

| Scope | Permission | Use Case |
|-------|-----------|----------|
| `a2a:message` | Send/receive messages | Basic agent communication |
| `a2a:task` | Create, read, cancel tasks | Task management |
| `a2a:stream` | Use streaming responses | Real-time updates |
| `a2a:push` | Register push notifications | Event notifications |
| `a2a:discover` | Discover other agents | Agent marketplace |
| `a2a:admin` | Administrative access | Management operations |

---

## Common Workflows

### Workflow 1: Client Sends Message to Server

```
1. User: "Send 'Hello' to https://server-agent.com"

2. You:
   a. Get access token (client_credentials)
   b. Fetch target agent card
   c. Verify trust (optional but recommended)
   d. Send authenticated message
   e. Handle response

3. Present result to user
```

### Workflow 2: Server Validates Incoming Request

```
1. Incoming request to your agent

2. Middleware:
   a. Extract Bearer token from Authorization header
   b. Validate token via introspection
   c. Check scopes match required permissions
   d. Verify caller's trust level
   e. Log audit entry

3. If all checks pass, process request
4. If any check fails, return 401/403
```

### Workflow 3: Token Exchange for Delegation

```
1. User: "Call agent B on behalf of agent A"

2. You:
   a. Agent A gets its own token
   b. Exchange token for one scoped to agent B
   c. Use exchanged token to call agent B
   d. Agent B validates and sees original caller (A)

3. Return result to user
```

---

## A2A Protocol Endpoints

Standard A2A endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/agent-card.json` | GET | Get agent metadata |
| `/a2a` | POST | Send message/task (JSON-RPC 2.0) |
| `/a2a/tasks/:id` | GET | Get task status |
| `/a2a/tasks/:id/cancel` | POST | Cancel a task |
| `/a2a/stream/:taskId` | GET | Stream task updates (SSE) |

---

## Error Handling

| Error | Code | Meaning | Action |
|-------|------|---------|--------|
| Invalid token | 401 | Token expired or invalid | Get new token |
| Insufficient scope | 403 | Missing required scope | Request token with correct scopes |
| Untrusted agent | 403 | Trust level too low | Improve trust score or use different agent |
| Agent not found | 404 | Target agent doesn't exist | Check URL |
| Rate limit | 429 | Too many requests | Back off and retry |

---

## Security Best Practices

### 1. Always Verify Trust
Before calling an unknown agent, check trust score. Only interact with STANDARD or higher.

### 2. Use Token Exchange
For agent-to-agent calls, exchange tokens to scope them to the target. This prevents token reuse.

### 3. Validate All Incoming Tokens
Never trust the Authorization header without validation. Always introspect.

### 4. Limit Token Lifetime
Request tokens with short expiry (1 hour). Refresh as needed.

### 5. Log All Interactions
Enable audit logging for compliance and debugging.

### 6. Scope Tokens Narrowly
Only request scopes you need. Don't ask for `a2a:admin` if you only send messages.

---

## Integration Examples

### Example 1: Simple Client

```javascript
// 1. Get token
const tokenResponse = await fetch('${PRAESIDIA_API_URL}/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'my-agent',
    client_secret: 'secret',
    scope: 'a2a:message'
  })
});
const { access_token } = await tokenResponse.json();

// 2. Send message
const response = await fetch('https://target-agent.com/a2a', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'message/send',
    params: {
      message: {
        messageId: crypto.randomUUID(),
        role: 'user',
        kind: 'message',
        parts: [{ kind: 'text', text: 'Hello!' }]
      }
    }
  })
});
```

### Example 2: Server with Middleware

```javascript
// Express middleware
app.post('/a2a', async (req, res) => {
  // 1. Extract token
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // 2. Validate token
  const introspection = await fetch('${PRAESIDIA_API_URL}/oauth/introspect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Bearer ${PRAESIDIA_API_KEY}'
    },
    body: new URLSearchParams({ token })
  });
  const tokenData = await introspection.json();
  
  if (!tokenData.active) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // 3. Check scopes
  const scopes = tokenData.scope.split(' ');
  if (!scopes.includes('a2a:message')) {
    return res.status(403).json({ error: 'Insufficient scope' });
  }
  
  // 4. Verify trust
  const trustResponse = await fetch(`${PRAESIDIA_API_URL}/agents/${tokenData.agent_id}/trust`, {
    headers: { 'Authorization': `Bearer ${PRAESIDIA_API_KEY}` }
  });
  const trust = await trustResponse.json();
  
  if (trust.score < 60) {
    return res.status(403).json({ error: 'Untrusted agent' });
  }
  
  // 5. Process request
  const message = req.body.params.message;
  const response = processMessage(message);
  
  // 6. Return result
  res.json({
    jsonrpc: '2.0',
    id: req.body.id,
    result: { message: response }
  });
});
```

---

## Environment Variables

- `PRAESIDIA_API_KEY` (required) - Your Praesidia API key
- `PRAESIDIA_API_URL` (optional) - API base URL (default: `https://api.praesidia.ai`)
- `AGENT_CLIENT_ID` (required for client) - Your agent's client ID
- `AGENT_CLIENT_SECRET` (required for client) - Your agent's client secret

---

## Additional Resources

- **A2A Protocol Spec:** https://a2a-protocol.org
- **Praesidia A2A SDK:** GitHub repo at sdk-a2a/
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **Token Exchange RFC:** https://datatracker.ietf.org/doc/html/rfc8693
- **API Documentation:** https://praesidia.ai/docs/api
- **Support:** support@praesidia.ai or https://discord.gg/praesidia

---

## Troubleshooting

### "invalid_client" Error
- Check client_id and client_secret are correct
- Ensure agent is registered in Praesidia
- Verify agent status is ACTIVE

### "insufficient_scope" Error
- Request token with required scopes
- Check target endpoint's scope requirements
- Verify your agent has permission for those scopes

### "Untrusted agent" (403)
- Improve your agent's trust score
- Complete verification steps in Praesidia
- Add compliance certifications
- Build positive interaction history

### Token Expired
- Tokens typically last 1 hour
- Implement token refresh logic
- Cache tokens and reuse until expiry

---

## Tips

- **Cache tokens** - Don't request new token for every call
- **Check trust first** - Save API calls by verifying trust before messaging
- **Use appropriate scopes** - Don't over-request permissions
- **Handle token exchange** - For agent-to-agent calls, exchange tokens
- **Implement retries** - Handle 401 by refreshing token and retrying
- **Log everything** - Audit logging helps debug auth issues
