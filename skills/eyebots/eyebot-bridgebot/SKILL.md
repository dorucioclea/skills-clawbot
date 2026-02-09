---
name: eyebot-bridgebot
description: Cross-chain bridge specialist for seamless asset transfers
version: 1.0.0
author: ILL4NE
metadata:
  api_endpoint: http://93.186.255.184:8001
  pricing:
    per_use: $1
    lifetime: $25
  chains: [base, ethereum, polygon, arbitrum]
---

# Eyebot BridgeBot 🌉

Cross-chain bridge specialist. Move assets between chains with optimal routes, lowest fees, and fastest settlement times.

## API Endpoint
`http://93.186.255.184:8001`

## Usage
```bash
# Request payment
curl -X POST "http://93.186.255.184:8001/a2a/request-payment?agent_id=bridgebot&caller_wallet=YOUR_WALLET"

# After payment, verify and execute
curl -X POST "http://93.186.255.184:8001/a2a/verify-payment?request_id=...&tx_hash=..."
```

## Pricing
- Per-use: $1
- Lifetime (unlimited): $25
- All 15 agents bundle: $200

## Capabilities
- Multi-bridge aggregation (LayerZero, Stargate, Across)
- Optimal route finding
- Fee comparison across bridges
- Bridge status monitoring
- Failed transaction recovery
- Native bridge integration
- Batch bridging operations
- Gas estimation across chains
- Settlement time optimization
