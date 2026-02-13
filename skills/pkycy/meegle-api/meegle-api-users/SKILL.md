---
name: meegle-api-users
description: |
  Meegle API prerequisite: domain, access token (plugin/user), context (project_key, user_key),
  request headers, and global constraints. User-related OpenAPIs. Read this first before other Meegle API skills.
metadata:
  { "openclaw": {} }
---

# Meegle API — Users (and shared prerequisites)

Shared prerequisites for all Meegle OpenAPI calls. Other Meegle API skills (Space, Work Items, Setting, Comments, Views & Measurement) assume you have followed this skill for token and headers.

## Domain (API base host)

Replace `{domain}` in requests with the actual Meegle API host for your region:

| Region | domain |
|--------|--------|
| **International** | `project.larksuite.com` — base URL: `https://project.larksuite.com` |
| **China (Feishu Project)** | `project.feishu.cn` — base URL: `https://project.feishu.cn` |

Example: plugin token URL is `https://{domain}/open_api/authen/plugin_token` — use `https://project.larksuite.com/open_api/authen/plugin_token` (international) or `https://project.feishu.cn/open_api/authen/plugin_token` (China).

---

## Obtain Access Token

Generate Meegle access credentials for OpenClaw to call OpenAPI.

### When to Use

- Before calling any Meegle OpenAPI
- When plugin_access_token has expired (valid for 2 hours)
- When an operation must be performed on behalf of a specific user

### Capabilities

- `generate_plugin_token` — obtain plugin_access_token or virtual_plugin_token
- `exchange_user_access_token` — exchange authorization code for user_access_token
- `refresh_user_access_token` — refresh an expired user_access_token

### API Spec: obtain_access_token

```yaml
name: meegle.obtain_access_token
description: >
  Generate Meegle access credentials for OpenClaw to call OpenAPI.
  Supports plugin_access_token, virtual_plugin_token (dev),
  and user_access_token (on behalf of a user).

when_to_use:
  - Before calling any Meegle OpenAPI
  - When plugin_access_token expires (2 hours)
  - When an operation must be performed on behalf of a specific user

capabilities:
  - generate_plugin_token
  - generate_virtual_plugin_token
  - exchange_user_access_token
  - refresh_user_access_token

flows:

  generate_plugin_token:
    description: Obtain plugin_access_token or virtual_plugin_token
    http:
      method: POST
      path: /open_api/authen/plugin_token
    headers:
      Content-Type: application/json
    body:
      plugin_id:
        type: string
        required: true
      plugin_secret:
        type: string
        required: true
      type:
        type: integer
        required: false
        default: 0
        enum:
          - 0  # plugin_access_token
          - 1  # virtual_plugin_token
    response:
      token:
        type: string
      expire_time:
        type: integer
        unit: seconds
    notes:
      - Token valid for 7200 seconds
      - Token must be cached and reused until expiration

  exchange_user_access_token:
    description: >
      Exchange authorization code for user_access_token.
      Must be called server-side.
    prerequisites:
      - plugin_access_token
      - authorization_code (from client getAuthCode)
    http:
      method: POST
      path: /open_api/authen/user_plugin_token
    headers:
      Content-Type: application/json
      X-Plugin-Token: "{{plugin_access_token}}"
    body:
      code:
        type: string
        required: true
      grant_type:
        type: string
        required: true
        fixed: authorization_code
    response:
      token:
        type: string
        description: user_access_token
      refresh_token:
        type: string
      expire_time:
        type: integer
      refresh_token_expire_time:
        type: integer
      user_key:
        type: string
      saas_tenant_key:
        type: string

  refresh_user_access_token:
    description: Refresh an expired user_access_token
    prerequisites:
      - plugin_access_token
      - refresh_token
    http:
      method: POST
      path: /open_api/authen/refresh_token
    headers:
      Content-Type: application/json
      X-Plugin-Token: "{{plugin_access_token}}"
    body:
      refresh_token:
        type: string
        required: true
      type:
        type: integer
        required: true
        fixed: 1
    response:
      token:
        type: string
      expire_time:
        type: integer
      refresh_token:
        type: string
      refresh_token_expire_time:
        type: integer

usage_in_other_skills:
  plugin_access_token:
    headers:
      X-Plugin-Token: "{{plugin_access_token}}"
      X-User-Key: "{{user_key}}"
  user_access_token:
    headers:
      X-Plugin-Token: "{{user_access_token}}"

constraints:
  - user_access_token must be generated server-side
  - front-end plugins cannot call OpenAPI directly
  - permissions depend on plugin scope, space installation, and user role

recommended_openclaw_strategy:
  - Cache plugin_access_token globally
  - Bind user_access_token to conversation/session
  - Auto-refresh user_access_token when expired
  - Choose token type per API based on permission requirements
```

### How to use tokens (when calling other OpenAPIs)

- **plugin_access_token**: Add header `X-Plugin-Token: {{plugin_access_token}}`; optionally `X-User-Key: {{user_key}}`.
- **user_access_token**: Add header `X-Plugin-Token: {{user_access_token}}` (use the user token here, not the plugin token).

### Constraints and recommendations

- user_access_token must be obtained server-side via authorization code; front-end plugins cannot call OpenAPI directly.
- Permissions depend on plugin scope, space installation, and user role.
- Recommended: cache plugin_access_token globally; bind user_access_token to conversation/session; refresh user_access_token when expired; choose token type per API based on permission requirements.

---

## Skill Pack (implementation details)

Auth, context, request headers, and global constraints for OpenClaw implementation and integration.

### Auth Layer

```yaml
name: meegle.auth.get_plugin_token
type: internal
description: Get or refresh Meegle plugin_access_token (cache and reuse)
inputs:
  plugin_id:
    type: string
    required: true
    source: secret
    description: |
      Plugin ID.
      Location: Meegle Developer Platform → Plugin → Basic Information → Plugin ID
  plugin_secret:
    type: string
    required: true
    source: secret
    description: |
      Plugin secret.
      Location: Meegle Developer Platform → Plugin → Basic Information → Plugin Secret
  type:
    type: integer
    required: false
    default: 0
    description: |
      0 = plugin_access_token
      1 = virtual_plugin_token (dev only)
http:
  method: POST
  url: https://{domain}/open_api/authen/plugin_token
  notes: domain = project.larksuite.com (international) or project.feishu.cn (China Feishu Project)
headers:
  Content-Type: application/json
outputs:
  token:
    type: string
    description: plugin_access_token
  expire_time:
    type: number
    description: Token validity in seconds

---

name: meegle.auth.get_user_token
type: flow
description: Exchange OAuth authorization code for user_access_token (act on behalf of user)
inputs:
  auth_code:
    type: string
    required: true
    description: |
      OAuth authorization code.
      Obtain via front-end: window.JSSDK.utils.getAuthCode()
  plugin_access_token:
    type: string
    required: true
http:
  method: POST
  url: https://{domain}/open_api/authen/user_plugin_token
headers:
  Content-Type: application/json
  X-Plugin-Token: "{{plugin_access_token}}"
body:
  code: "{{auth_code}}"
  grant_type: authorization_code
outputs:
  user_access_token:
    type: string
  refresh_token:
    type: string
  expire_time:
    type: number
  refresh_token_expire_time:
    type: number
  user_key:
    type: string
    description: |
      Current user unique identifier.
      Source: user_key field in this response

---

name: meegle.auth.refresh_user_token
type: internal
description: Refresh user_access_token
inputs:
  refresh_token:
    type: string
    required: true
  plugin_access_token:
    type: string
    required: true
http:
  method: POST
  url: https://{domain}/open_api/authen/refresh_token
headers:
  Content-Type: application/json
  X-Plugin-Token: "{{plugin_access_token}}"
body:
  type: 1
outputs:
  user_access_token:
    type: string
  expire_time:
    type: number
  refresh_token:
    type: string
  refresh_token_expire_time:
    type: number
```

### Context Layer

```yaml
name: meegle.context.resolve_project
type: utility
description: Resolve project_key
inputs:
  project_key:
    type: string
    required: false
    description: |
      Space unique identifier.
      How to get: 1) Double-click space icon in Meegle project. 2) project_key in project URL.
behavior:
  - If default project_key is configured, use it
  - Otherwise ask user to provide
outputs:
  project_key:
    type: string

---

name: meegle.context.resolve_user_key
type: utility
description: Resolve user_key
inputs:
  user_key:
    type: string
    required: false
    description: |
      User unique identifier.
      How to get: 1) Double-click user avatar in Meegle. 2) user_key from user_access_token response.
  user_access_token:
    type: string
    required: false
behavior:
  - If user_access_token exists, use its user_key first
  - Otherwise ask user to provide explicitly
outputs:
  user_key:
    type: string
```

### Header Decision Rule

```yaml
name: meegle.http.prepare_headers
type: internal
description: Build OpenAPI request headers by operation type
inputs:
  operation_type:
    type: string
    required: true
    description: read | write
  plugin_access_token:
    type: string
    required: true
  user_access_token:
    type: string
    required: false
  user_key:
    type: string
    required: false
rules:
  - if: operation_type == "write" and user_access_token exists
    headers:
      X-Plugin-Token: "{{user_access_token}}"
  - if: operation_type == "read"
    headers:
      X-Plugin-Token: "{{plugin_access_token}}"
      X-User-Key: "{{user_key}}"
```

### Global Constraints

- plugin_access_token is valid for 7200 seconds; cache and reuse.
- user_access_token must be used server-side only.
- Prefer user_access_token for write operations.
- All OpenAPI calls must respect 15 QPS per token.

---

## Users (OpenAPIs)

User-related Meegle OpenAPIs (e.g. user info, list members) to be documented here. Prerequisites: domain and token from sections above.
