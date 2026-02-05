# A2A Protocol OpenClaw Skill

Implement secure Agent-to-Agent (A2A) communication with OAuth authentication, trust verification, and messaging using the A2A protocol and Praesidia identity layer.

## Installation

### From ClawHub (Recommended)

```bash
clawhub install a2a
```

### Manual Installation

1. Copy this folder to your OpenClaw skills directory:
   - Global: `~/.openclaw/skills/a2a/`
   - Workspace: `<workspace>/skills/a2a/`

2. OpenClaw will pick it up in the next session

## Setup

### 1. Get Praesidia API Credentials

1. Sign up at [https://praesidia.ai](https://praesidia.ai)
2. Register an agent in your organization
3. Navigate to Settings → API Keys
4. Create a new API key
5. Get your agent's client credentials (client_id and client_secret)

### 2. Configure OpenClaw

Add credentials to your OpenClaw configuration at `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "a2a": {
        "apiKey": "pk_live_abc123...",
        "env": {
          "PRAESIDIA_API_URL": "https://api.praesidia.ai",
          "AGENT_CLIENT_ID": "ag_your_client_id",
          "AGENT_CLIENT_SECRET": "sec_your_secret"
        }
      }
    }
  }
}
```

**Configuration options:**
- `apiKey` (required) - Your Praesidia API key
- `env.PRAESIDIA_API_URL` (optional) - API base URL
  - Production: `https://api.praesidia.ai` (default)
  - Local development: `http://localhost:5001`
- `env.AGENT_CLIENT_ID` (required) - Your agent's OAuth client ID
- `env.AGENT_CLIENT_SECRET` (required) - Your agent's OAuth client secret

### 3. Verify Setup

Start a new OpenClaw session and ask:

```
"Get an access token for my agent"
```

If configured correctly, OpenClaw will authenticate and return a token.

## Usage

### OAuth & Authentication

```
"Get an access token with message and task scopes"
"Exchange my token to call agent at https://target.com"
"Validate this token: eyJhbG..."
```

### Agent-to-Agent Messaging

```
"Send 'Hello' to agent at https://agent.example.com"
"Call the data analyzer agent with this JSON data"
"Get the agent card from https://agent.example.com"
```

### Trust Verification

```
"Check trust score for agent abc-123"
"Is agent xyz trustworthy enough to call?"
"Verify trust before messaging agent at https://..."
```

### Server Setup

```
"Set up OAuth endpoints for my agent"
"Configure middleware with authentication and trust verification"
"Make my agent an A2A server"
```

## Features

- ✅ **OAuth 2.0/OIDC** - Full OAuth client and provider flows
- ✅ **Token Management** - Issue, exchange, validate, and introspect tokens
- ✅ **A2A Messaging** - Send authenticated messages using JSON-RPC 2.0
- ✅ **Trust Verification** - Verify trust levels before interactions
- ✅ **Middleware** - Authentication, authorization, audit logging
- ✅ **Agent Cards** - Fetch and parse A2A agent card metadata
- ✅ **Secure** - All requests use HTTPS and token-based auth

## A2A Protocol Overview

The A2A (Agent-to-Agent) protocol enables secure communication between AI agents. Key concepts:

### 1. Agent Card
Every agent exposes a card at `/.well-known/agent-card.json` with:
- Agent metadata (name, description, version)
- Capabilities (streaming, push notifications, etc.)
- Skills and tools available
- OAuth endpoints

### 2. Authentication
Agents authenticate using OAuth 2.0:
- **Client Credentials Grant** - Agent gets its own token
- **Token Exchange** - Agent A gets token scoped to Agent B
- **Bearer Tokens** - JWT tokens in Authorization header

### 3. Messaging
Messages use JSON-RPC 2.0 format:
```json
{
  "jsonrpc": "2.0",
  "id": "request-123",
  "method": "message/send",
  "params": {
    "message": {
      "messageId": "msg-456",
      "role": "user",
      "kind": "message",
      "parts": [
        { "kind": "text", "text": "Hello!" }
      ]
    }
  }
}
```

### 4. Trust Framework
Before interacting, agents should verify trust:
- **Score (0-100)** - Numeric trust rating
- **Level** - UNTRUSTED, LIMITED, STANDARD, VERIFIED, TRUSTED
- **Components** - Identity, behavior, security, compliance

## Common Workflows

### Workflow 1: Send Message to Another Agent

```
1. User: "Send 'Analyze this data' to https://analyzer.example.com"

2. OpenClaw with this skill:
   a. Gets OAuth token (client_credentials)
   b. Fetches target agent card
   c. Verifies trust score (optional but recommended)
   d. Sends authenticated POST to /a2a endpoint
   e. Returns response

3. User sees: "Message sent successfully. Response: [data analysis]"
```

### Workflow 2: Set Up A2A Server

```
1. User: "Make my agent an A2A server with authentication"

2. OpenClaw with this skill:
   Provides guidance on:
   - Implementing /.well-known/agent-card.json
   - Setting up /oauth/token endpoint
   - Configuring /a2a message handler
   - Adding middleware (auth, trust, audit)
   - Exposing JWKS for token validation

3. User implements following the guidance
```

### Workflow 3: Token Exchange for Delegation

```
1. User: "Get a token to call Agent B on behalf of Agent A"

2. OpenClaw with this skill:
   a. Uses Agent A's credentials to get base token
   b. Exchanges token via RFC 8693 token exchange
   c. Returns token scoped to Agent B
   d. Explains how to use it

3. User can now call Agent B with delegated authority
```

## API Endpoints Used

The skill interacts with these Praesidia endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/token` | POST | Get access token (client_credentials or token_exchange) |
| `/oauth/introspect` | POST | Validate and introspect tokens |
| `/agents/:id/trust` | GET | Get trust score and level |
| `/.well-known/jwks.json` | GET | Get public keys for token validation |

And standard A2A endpoints on target agents:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/agent-card.json` | GET | Get agent metadata |
| `/a2a` | POST | Send message or task (JSON-RPC 2.0) |
| `/a2a/tasks/:id` | GET | Get task status |
| `/a2a/stream/:taskId` | GET | Stream task updates (SSE) |

## OAuth Scopes

| Scope | Permission | Use Case |
|-------|-----------|----------|
| `a2a:message` | Send/receive messages | Basic agent communication |
| `a2a:task` | Create, read, cancel tasks | Task management |
| `a2a:stream` | Use streaming responses | Real-time updates |
| `a2a:push` | Register push notifications | Event notifications |
| `a2a:discover` | Discover other agents | Agent marketplace |
| `a2a:admin` | Administrative access | Management operations |

## Troubleshooting

### "invalid_client" Error

**Problem:** Client credentials are invalid

**Solution:**
1. Verify `AGENT_CLIENT_ID` and `AGENT_CLIENT_SECRET` in config
2. Ensure agent is registered in Praesidia
3. Check agent status is ACTIVE
4. Regenerate credentials if needed

### "insufficient_scope" Error

**Problem:** Token doesn't have required scopes

**Solution:**
1. Request token with correct scopes: `a2a:message a2a:task`
2. Check target endpoint's scope requirements
3. Verify your agent has permission for those scopes in Praesidia

### "Untrusted agent" (403)

**Problem:** Caller's trust level is too low

**Solution:**
1. Complete agent verification in Praesidia dashboard
2. Add compliance certifications (SOC2, GDPR, etc.)
3. Build positive interaction history
4. Contact target agent owner for whitelist

### Token Expired

**Problem:** Token lifetime exceeded (typically 1 hour)

**Solution:**
1. Implement token caching with expiry checking
2. Request new token when expired
3. Consider implementing token refresh logic

### Connection Refused

**Problem:** Cannot reach target agent

**Solution:**
1. Verify target URL is correct
2. Check agent is online and accessible
3. Ensure firewall/network allows connection
4. Try fetching agent card first: `/.well-known/agent-card.json`

## Security Best Practices

1. **Always verify trust** before calling unknown agents
2. **Use token exchange** for agent-to-agent calls (scoped tokens)
3. **Validate incoming tokens** via introspection
4. **Limit token lifetime** to 1 hour or less
5. **Log all interactions** for audit and compliance
6. **Request minimal scopes** - only what you need
7. **Rotate credentials regularly** - especially after exposure
8. **Never expose secrets** - keep client_secret secure

## Development

### Local Praesidia Instance

If running Praesidia locally:

```json
{
  "skills": {
    "entries": {
      "a2a": {
        "apiKey": "pk_test_local",
        "env": {
          "PRAESIDIA_API_URL": "http://localhost:5001",
          "AGENT_CLIENT_ID": "test-agent",
          "AGENT_CLIENT_SECRET": "test-secret"
        }
      }
    }
  }
}
```

### Testing

Ask OpenClaw to:

```
"Get a token for my agent"
"Send a test message to https://echo-agent.example.com"
"Verify trust for agent test-123"
```

Expected responses should include token, message confirmation, and trust score.

## Integration with Other Skills

This skill works well with:

- **praesidia** - For agent verification and guardrails
- **mcp-praesidia** - For MCP server integration
- Any A2A-compatible agent skills

## Support

- **A2A Protocol:** [https://a2a-protocol.org](https://a2a-protocol.org)
- **Praesidia Docs:** [https://praesidia.ai/docs](https://praesidia.ai/docs)
- **A2A SDK:** [https://github.com/a2aproject/a2a-js](https://github.com/a2aproject/a2a-js)
- **Issues:** [GitHub Issues](https://github.com/praesidia/praesidia/issues)
- **Community:** [Discord](https://discord.gg/praesidia)
- **Email:** support@praesidia.ai

## License

MIT License - See main repository for details

## Version

Current version: 1.0.0

For updates: `clawhub update a2a` or check [ClawHub](https://clawhub.ai)
