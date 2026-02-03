---
name: jotform
description: |
  JotForm API integration with managed OAuth. Create forms, manage submissions, and access form data. Use this skill when users want to interact with JotForm forms and submissions.
compatibility: Requires network access and valid Maton API key
metadata:
  author: maton
  version: "1.0"
---

# JotForm

Access the JotForm API with managed OAuth authentication. Create and manage forms, retrieve submissions, and manage webhooks.

## Quick Start

```bash
# List user forms
curl -s -X GET 'https://gateway.maton.ai/jotform/user/forms?limit=20' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

## Base URL

```
https://gateway.maton.ai/jotform/{native-api-path}
```

Replace `{native-api-path}` with the actual JotForm API endpoint path. The gateway proxies requests to `api.jotform.com` and automatically injects your API key.

## Authentication

All requests require the Maton API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

**Environment Variable:** Set your API key as `MATON_API_KEY`:

```bash
export MATON_API_KEY="YOUR_API_KEY"
```

### Getting Your API Key

1. Sign in or create an account at [maton.ai](https://maton.ai)
2. Go to [maton.ai/settings](https://maton.ai/settings)
3. Copy your API key

## Connection Management

Manage your JotForm connections at `https://ctrl.maton.ai`.

### List Connections

```bash
curl -s -X GET 'https://ctrl.maton.ai/connections?app=jotform&status=ACTIVE' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Create Connection

```bash
curl -s -X POST 'https://ctrl.maton.ai/connections' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{"app": "jotform"}'
```

### Get Connection

```bash
curl -s -X GET 'https://ctrl.maton.ai/connections/{connection_id}' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

**Response:**
```json
{
  "connection": {
    "connection_id": "21fd90f9-5935-43cd-b6c8-bde9d915ca80",
    "status": "ACTIVE",
    "creation_time": "2025-12-08T07:20:53.488460Z",
    "last_updated_time": "2026-01-31T20:03:32.593153Z",
    "url": "https://connect.maton.ai/?session_token=...",
    "app": "jotform",
    "metadata": {}
  }
}
```

Open the returned `url` in a browser to complete OAuth authorization.

### Delete Connection

```bash
curl -s -X DELETE 'https://ctrl.maton.ai/connections/{connection_id}' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Specifying Connection

If you have multiple JotForm connections, specify which one to use with the `Maton-Connection` header:

```bash
curl -s -X GET 'https://gateway.maton.ai/jotform/user/forms' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Maton-Connection: 21fd90f9-5935-43cd-b6c8-bde9d915ca80'
```

If omitted, the gateway uses the default (oldest) active connection.

## API Reference

### User

```bash
GET /jotform/user
GET /jotform/user/forms?limit=20
GET /jotform/user/submissions?limit=20
GET /jotform/user/usage
```

### Forms

#### Get Form

```bash
GET /jotform/form/{formId}
```

#### Get Form Questions

```bash
GET /jotform/form/{formId}/questions
```

#### Get Form Submissions

```bash
GET /jotform/form/{formId}/submissions?limit=20
```

With filter:

```bash
GET /jotform/form/{formId}/submissions?filter={"created_at:gt":"2024-01-01"}
```

#### Create Form

```bash
POST /jotform/user/forms
Content-Type: application/json

{
  "properties": {"title": "Contact Form"},
  "questions": {
    "1": {"type": "control_textbox", "text": "Name", "name": "name"},
    "2": {"type": "control_email", "text": "Email", "name": "email"}
  }
}
```

#### Delete Form

```bash
DELETE /jotform/form/{formId}
```

### Submissions

#### Get Submission

```bash
GET /jotform/submission/{submissionId}
```

#### Delete Submission

```bash
DELETE /jotform/submission/{submissionId}
```

### Webhooks

```bash
GET /jotform/form/{formId}/webhooks
POST /jotform/form/{formId}/webhooks
DELETE /jotform/form/{formId}/webhooks/{webhookIndex}
```

## Question Types

- `control_textbox` - Single line text
- `control_textarea` - Multi-line text
- `control_email` - Email
- `control_phone` - Phone number
- `control_dropdown` - Dropdown
- `control_radio` - Radio buttons
- `control_checkbox` - Checkboxes
- `control_datetime` - Date/time picker
- `control_fileupload` - File upload

## Filter Syntax

```json
{"field:gt":"value"}  // Greater than
{"field:lt":"value"}  // Less than
{"field:eq":"value"}  // Equal to
```

## Code Examples

### JavaScript

```javascript
const response = await fetch(
  'https://gateway.maton.ai/jotform/user/forms?limit=10',
  {
    headers: {
      'Authorization': `Bearer ${process.env.MATON_API_KEY}`
    }
  }
);
```

### Python

```python
import os
import requests

response = requests.get(
    'https://gateway.maton.ai/jotform/user/forms',
    headers={'Authorization': f'Bearer {os.environ["MATON_API_KEY"]}'},
    params={'limit': 10}
)
```

## Notes

- Form IDs are numeric
- Pagination uses `limit` and `offset`
- Use `orderby` to sort results

## Error Handling

| Status | Meaning |
|--------|---------|
| 400 | Missing JotForm connection |
| 401 | Invalid or missing Maton API key |
| 429 | Rate limited (10 req/sec per account) |
| 4xx/5xx | Passthrough error from JotForm API |

## Resources

- [JotForm API Overview](https://api.jotform.com/docs/)
- [User Forms](https://api.jotform.com/docs/#user-forms)
- [Form Submissions](https://api.jotform.com/docs/#form-id-submissions)
- [Webhooks](https://api.jotform.com/docs/#form-id-webhooks)
