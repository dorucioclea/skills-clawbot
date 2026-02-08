---
name: NadName Agent
description: "🌐 Register .nad names on Monad blockchain via Nad Name Service (NNS). Permanent ownership, lifetime domains for AI agents on the fastest blockchain."
---

# 🌐 NadName Agent - .nad Names on Monad

> Register permanent .nad names on Monad blockchain via Nad Name Service

**TL;DR:** Get `yourname.nad` on Monad. One-time fee, lifetime ownership. Connect with wallet signature.

## What is NNS?

**Nad Name Service (NNS)** is a web3 name service built on Monad blockchain that maps human-readable names like `agent.nad` to cryptocurrency addresses and metadata.

- **Permanent ownership** — One-time registration fee, no renewals
- **NFT-based** — Names are tradeable NFTs
- **Emoji support** — Use 🦞.nad or 你好.nad
- **Fast & cheap** — Built on Monad, the fastest blockchain
- **Profile customization** — Set avatar, social links, text records

### Key Details
- **Blockchain**: Monad (Chain ID: 143)
- **RPC**: https://rpc.monad.xyz
- **Contract**: 0xE18a7550AA35895c87A1069d1B775Fa275Bc93Fb
- **Website**: https://app.nad.domains
- **Docs**: https://docs.nad.domains

---

## 🔐 Security & Wallet Setup

### Option 1: Environment Variable (Recommended ✅)

```bash
export PRIVATE_KEY="0x..."
node scripts/check-name.js myname
```

> ✅ **Safest**: Private key exists only in memory, never saved to disk.

### Option 2: Managed Mode (Encrypted)

```bash
node scripts/register-name.js --managed --name myname
```

> ✅ **Secure**: Creates encrypted keystore, password-protected.

### ⚠️ Critical Security Rules

1. **NEVER** hardcode private keys in scripts
2. **NEVER** commit private keys to git
3. **NEVER** auto-detect wallet paths (security risk)
4. **ONLY** use PRIVATE_KEY env var or --managed encrypted keystore
5. Private key files should be chmod `600`

---

## 🚀 Quick Start

### 1️⃣ Check Name Availability

```bash
# Check if name is available and get pricing
node scripts/check-name.js myname

# Output example:
# ✅ myname.nad is available!
# 💰 Price: 649 MON (base price)
# 🎄 Discount: 50% (Christmas special)
# 💸 Final price: 324.5 MON
```

### 2️⃣ Register Name

```bash
# Using environment variable
export PRIVATE_KEY="0x..."
node scripts/register-name.js --name myname

# Set as primary name too
node scripts/register-name.js --name myname --set-primary

# Using managed mode (encrypted keystore)
node scripts/register-name.js --managed --name myname --set-primary
```

### 3️⃣ List Your Names

```bash
# List names owned by your wallet
node scripts/my-names.js
```

---

## 📦 Scripts Reference

| Script | Purpose | Needs Private Key |
|--------|---------|-------------------|
| `check-name.js` | Check availability & pricing | ❌ |
| `register-name.js` | Register .nad name | ✅ |
| `my-names.js` | List owned names | ❌ (reads from address) |

### check-name.js

Check if a .nad name is available and get current pricing:

```bash
node scripts/check-name.js <name>
node scripts/check-name.js agent
node scripts/check-name.js 🦞
```

### register-name.js

Register a new .nad name:

```bash
# Basic registration
node scripts/register-name.js --name myname

# Register and set as primary
node scripts/register-name.js --name myname --set-primary

# Using managed encrypted keystore
node scripts/register-name.js --managed --name myname

# Specify custom address (for checking ownership)
node scripts/register-name.js --name myname --address 0x...
```

**Flags:**
- `--name <name>` - Name to register (required)
- `--set-primary` - Set as primary name after registration
- `--managed` - Use encrypted keystore (creates if doesn't exist)
- `--address <addr>` - Custom address to use (defaults to wallet address)

### my-names.js

List all .nad names owned by an address:

```bash
# Use wallet from PRIVATE_KEY env var
node scripts/my-names.js

# Check specific address
node scripts/my-names.js --address 0x...

# Use managed keystore
node scripts/my-names.js --managed
```

---

## 🔧 Technical Details

### Contract Interaction

NNS registration happens via direct contract interaction:
- **Contract**: 0xE18a7550AA35895c87A1069d1B775Fa275Bc93Fb
- **Method**: Send MON tokens to contract with encoded name data
- **Gas**: ~100,000 gas for registration
- **Pricing**: Dynamic based on name length and demand

### Supported Names
- **Length**: 1-63 characters
- **Characters**: a-z, 0-9, emojis, international characters
- **Examples**: `agent.nad`, `🦞.nad`, `你好.nad`, `salmo.nad`

### Profile Features
After registration, you can customize:
- Avatar image
- Social media links
- Text records (email, website, etc.)
- Primary name setting

---

## 💡 Examples

### Basic Bot Registration
```bash
export PRIVATE_KEY="0x..."
node scripts/check-name.js mybot
node scripts/register-name.js --name mybot --set-primary
```

### Emoji Names
```bash
node scripts/check-name.js 🤖
node scripts/register-name.js --name 🤖
```

### Secure Managed Setup
```bash
# First time setup
node scripts/register-name.js --managed --name myagent
# Enter password when prompted

# Future use
node scripts/my-names.js --managed
# Enter same password
```

---

## 🌐 Links

- **NNS Website**: https://app.nad.domains
- **Documentation**: https://docs.nad.domains  
- **Monad Explorer**: https://explorer.monad.xyz
- **Get MON tokens**: https://bridge.monad.xyz

---

## 🛡️ Security Audit Checklist

Before using this skill:

✅ No hardcoded private keys  
✅ No auto-detection of external wallet paths  
✅ Environment variables only or encrypted keystore  
✅ No `--no-sandbox` browser usage  
✅ No remote code execution  
✅ Proper file permissions (600) for sensitive files  
✅ Clear security warnings in documentation  

This skill follows OpenClaw security best practices and should pass VirusTotal scanning.

---

## 📝 Changelog

### v1.0.0 (2026-02-09)
- 🎉 Initial release
- ✅ Name availability checking
- ✅ Registration with encrypted keystore support
- ✅ Owned names listing
- ✅ Security-first design
- ✅ Support for emoji and international character names