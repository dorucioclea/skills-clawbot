# Blinko Skill

An [OpenClaw](https://openclaw.ai) agent skill that lets your AI agent play [Blinko](https://blinko.gg) - provably fair on-chain Plinko on [Abstract](https://abs.xyz).

Your agent can place bets, play full games through the commit-reveal flow, check stats, view leaderboards, and track honey rewards. All headless, no browser needed.

## Quick Install

### 1. Install the Skill

```bash
clawdhub install BearishAF/blinko
```

### 2. Setup Abstract Wallet

```bash
# Generate a new wallet (or use an existing private key)
node -e "const w = require('ethers').Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey)"

# Set your private key as an environment variable
export WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Bridge ETH to Abstract (chain ID 2741) using one of:
#   - Abstract Bridge: https://portal.abs.xyz/bridge
#   - Relay: https://relay.link
#   - Orbiter: https://orbiter.finance
# Minimum balance needed: 0.0001 ETH (min bet) + gas
```

> **Tip:** The [abstract-onboard](https://clawhub.ai/Masoncags-tech/abstract-onboard) skill on ClawdHub can help your agent deploy contracts, bridge assets, swap tokens, and manage balances on Abstract programmatically.

---

## Prerequisites

- **Node.js** 18+
- **ethers.js** v6
- Abstract wallet with ETH (see Quick Install above)

## Usage

### Play a Game

```bash
node scripts/play-blinko.js [betETH] [--hard] [--v2]
```

**Examples:**

```bash
node scripts/play-blinko.js 0.001              # Normal mode, 0.001 ETH bet
node scripts/play-blinko.js 0.005 --hard        # Hard mode (must trigger bonus to win)
node scripts/play-blinko.js 0.002 --v2          # V2 algorithm
node scripts/play-blinko.js 0.003 --hard --v2   # V2 hard mode
```

**Bet limits:** 0.0001 - 0.1 ETH

### Check Stats

```bash
node scripts/stats.js <address> [command] [limit]
```

| Command | Description |
|---------|-------------|
| `profile` | Name, honey, game stats, streak |
| `games [N]` | Last N games with results |
| `leaderboard` | Top 10 + your rank |
| `honey` | Honey balance breakdown |

**Examples:**

```bash
node scripts/stats.js 0xYourAddress profile
node scripts/stats.js 0xYourAddress games 20
node scripts/stats.js 0xYourAddress leaderboard
```

## How It Works

Blinko uses a commit-reveal scheme for provably fair gameplay:

```
Login -> Create Game -> Commit On-Chain -> Play -> Settle On-Chain
```

1. **Login** - Sign a message with your wallet to get a JWT
2. **Create** - API generates a game seed and returns a server signature
3. **Commit** - Call `createGame()` on-chain with your ETH bet and a random salt
4. **Play** - API combines seeds, simulates the physics, returns the result
5. **Settle** - Call `cashOut()` (win) or `markGameAsLost()` (loss) on-chain

### Game Mechanics

- 10 balls dropped through 8 rows of pins
- Bin multipliers: 2x, 1.5x, 0.5x, 0.2x, 0.1x, 0.1x, 0.2x, 0.5x, 1.5x, 2x
- Collect B-O-N-U-S letters to trigger bonus rounds (up to level 9)
- Earn honey by hitting special pins (requires a referrer)

## Key Information

| Item | Value |
|------|-------|
| Chain | Abstract (2741) |
| Contract | `0x1859072d67fdD26c8782C90A1E4F078901c0d763` |
| API | `https://api.blinko.gg` |
| Game | [blinko.gg](https://blinko.gg) |
| RPC | `https://api.abs.xyz` |

## File Structure

```
blinko/
├── SKILL.md                        # OpenClaw skill definition
├── README.md                       # This file
├── package.json                    # Dependencies
└── scripts/
    ├── play-blinko.js              # Full game player (auth -> commit -> play -> settle)
    ├── stats.js                    # Profile, games, leaderboard, honey viewer
    └── commit-reveal-abi.json      # On-chain contract ABI
```

## License

MIT
