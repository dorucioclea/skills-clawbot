---
name: chargebee
description: |
  Chargebee API integration with managed OAuth. Manage subscriptions, customers, invoices, and hosted checkout pages. Use this skill when users want to interact with Chargebee billing data.
compatibility: Requires network access and valid Maton API key
metadata:
  author: maton
  version: "1.0"
---

# Chargebee

Access the Chargebee API with managed OAuth authentication. Manage subscriptions, customers, invoices, and billing workflows.

## Quick Start

```bash
# List customers
curl -s -X GET 'https://gateway.maton.ai/chargebee/api/v2/customers?limit=10' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

## Base URL

```
https://gateway.maton.ai/chargebee/{native-api-path}
```

Replace `{native-api-path}` with the actual Chargebee API endpoint path. The gateway proxies requests to `{subdomain}.chargebee.com` (automatically replaced with your connection config) and automatically injects authentication.

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

Manage your Chargebee connections at `https://ctrl.maton.ai`.

### List Connections

```bash
curl -s -X GET 'https://ctrl.maton.ai/connections?app=chargebee&status=ACTIVE' \
  -H 'Authorization: Bearer YOUR_API_KEY'
```

### Create Connection

```bash
curl -s -X POST 'https://ctrl.maton.ai/connections' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{"app": "chargebee"}'
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
    "app": "chargebee",
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

If you have multiple Chargebee connections, specify which one to use with the `Maton-Connection` header:

```bash
curl -s -X GET 'https://gateway.maton.ai/chargebee/api/v2/customers' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Maton-Connection: 21fd90f9-5935-43cd-b6c8-bde9d915ca80'
```

If omitted, the gateway uses the default (oldest) active connection.

## API Reference

### Customers

#### List Customers

```bash
GET /chargebee/api/v2/customers?limit=10
```

#### Get Customer

```bash
GET /chargebee/api/v2/customers/{customerId}
```

#### Create Customer

```bash
POST /chargebee/api/v2/customers
Content-Type: application/x-www-form-urlencoded

first_name=John&last_name=Doe&email=john@example.com
```

#### Update Customer

```bash
POST /chargebee/api/v2/customers/{customerId}
Content-Type: application/x-www-form-urlencoded

first_name=Jane
```

### Subscriptions

#### List Subscriptions

```bash
GET /chargebee/api/v2/subscriptions?limit=10
```

#### Get Subscription

```bash
GET /chargebee/api/v2/subscriptions/{subscriptionId}
```

#### Create Subscription

```bash
POST /chargebee/api/v2/subscriptions
Content-Type: application/x-www-form-urlencoded

plan_id=basic-plan&customer[email]=john@example.com&customer[first_name]=John
```

#### Cancel Subscription

```bash
POST /chargebee/api/v2/subscriptions/{subscriptionId}/cancel
Content-Type: application/x-www-form-urlencoded

end_of_term=true
```

### Item Prices (Product Catalog 2.0)

#### List Item Prices

```bash
GET /chargebee/api/v2/item_prices?limit=10
```

### Items

#### List Items

```bash
GET /chargebee/api/v2/items?limit=10
```

### Invoices

#### List Invoices

```bash
GET /chargebee/api/v2/invoices?limit=10
```

#### Download Invoice PDF

```bash
POST /chargebee/api/v2/invoices/{invoiceId}/pdf
```

### Hosted Pages

#### Checkout New Subscription

```bash
POST /chargebee/api/v2/hosted_pages/checkout_new_for_items
Content-Type: application/x-www-form-urlencoded

subscription[plan_id]=basic-plan&customer[email]=john@example.com
```

### Portal Sessions

#### Create Portal Session

```bash
POST /chargebee/api/v2/portal_sessions
Content-Type: application/x-www-form-urlencoded

customer[id]=cust_123
```

## Filtering

```bash
GET /chargebee/api/v2/subscriptions?status[is]=active
GET /chargebee/api/v2/customers?email[is]=john@example.com
GET /chargebee/api/v2/invoices?date[after]=1704067200
```

## Code Examples

### JavaScript

```javascript
const response = await fetch(
  'https://gateway.maton.ai/chargebee/api/v2/customers?limit=10',
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
    'https://gateway.maton.ai/chargebee/api/v2/customers',
    headers={'Authorization': f'Bearer {os.environ["MATON_API_KEY"]}'},
    params={'limit': 10}
)
```

## Notes

- Uses form-urlencoded data for POST requests
- Nested objects use bracket notation: `customer[email]`
- Timestamps are Unix timestamps
- List responses include `next_offset` for pagination
- Product Catalog 2.0: use `item_prices` and `items`

## Error Handling

| Status | Meaning |
|--------|---------|
| 400 | Missing Chargebee connection |
| 401 | Invalid or missing Maton API key |
| 429 | Rate limited (10 req/sec per account) |
| 4xx/5xx | Passthrough error from Chargebee API |

## Resources

- [Chargebee API Overview](https://apidocs.chargebee.com/docs/api)
- [Customers](https://apidocs.chargebee.com/docs/api/customers)
- [Subscriptions](https://apidocs.chargebee.com/docs/api/subscriptions)
- [Invoices](https://apidocs.chargebee.com/docs/api/invoices)
- [Hosted Pages](https://apidocs.chargebee.com/docs/api/hosted_pages)
