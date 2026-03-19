# Celo Payment Agent

> **Best Agent on Celo** — AI-powered payment agent that leverages Celo's sub-cent transaction fees for frequent, automated stablecoin payments.

## Why Celo?

Celo is an Ethereum L2 optimized for real-world payments. Transaction fees are typically **under $0.001**, making it uniquely suited for AI agents that need to execute frequent micro-payments — something cost-prohibitive on other chains.

**Key advantages for agent payments:**

- **Sub-cent gas fees** — An agent can execute thousands of payments per day for pennies in total gas, enabling true micro-payment workflows (payroll splits, streaming payments, DCA) that are uneconomical on Ethereum L1 or most L2s.
- **Native stablecoin support** — cUSD and cEUR are protocol-level stablecoins on Celo, meaning the agent can pay in stable value without extra DEX hops or wrapped token complexity.
- **Fast finality (~5 s)** — Payments confirm in seconds, so the agent can verify settlement and proceed to the next task without long waits.

## Architecture

```
┌────────────────┐     schedules      ┌────────────────┐
│ Payment Agent  │◄────────────────── │   Scheduler    │
│ (payment-      │  executes payments │   (scheduler   │
│  agent.ts)     │───────────────────►│    .ts)        │
└───────┬────────┘                    └────────────────┘
        │ sends tx / reads balances
        ▼
┌────────────────┐
│  Celo Network  │  Alfajores testnet or Mainnet
│  (viem + RPC)  │  cUSD · cEUR · CELO
└───────┬────────┘
        │ Transfer events
        ▼
┌────────────────┐
│   Analytics    │  volume, top recipients, summaries
│   Reporter     │
│  (reporter.ts) │
└────────────────┘
```

```
src/
├── celo/config.ts         # Celo chain definitions (mainnet + Alfajores testnet)
├── config.ts              # App configuration from environment
├── agent/
│   ├── payment-agent.ts   # Core agent: balances, payments, analytics, summaries
│   ├── scheduler.ts       # Recurring payment scheduler
│   └── log.ts             # JSONL payment log
├── analytics/
│   └── reporter.ts        # On-chain transfer event analytics
└── index.ts               # Entry point with monitoring loop
```

## Key Features

### Stablecoin Payments (cUSD / cEUR)
Execute cUSD or cEUR transfers programmatically. Every payment is logged to `logs/payments.jsonl` with timestamp, amounts, and transaction hash. Both stablecoins are first-class Celo protocol tokens — no wrapping or bridging required.

### Recurring Payment Scheduling
Define scheduled payments with label, recipient, amount, token, and interval. The scheduler automatically executes payments when due and reschedules for the next interval. Useful for payroll, subscriptions, or dollar-cost averaging.

### Balance Monitoring
The agent periodically checks cUSD, cEUR, and CELO balances for all configured addresses and generates human-readable summaries.

### On-Chain Analytics
The reporter queries ERC-20 Transfer events directly from Celo and computes:
- Total inbound/outbound volume
- Transaction count and average amount
- Top recipients by volume

## Quick Start

### Prerequisites

- Node.js ≥ 18
- A Celo wallet with testnet CELO (for gas) and cUSD — get from [Celo Faucet](https://faucet.celo.org)

### Setup (Alfajores Testnet)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set PRIVATE_KEY to a funded Alfajores wallet

# 3. Run the on-chain demo (reads balances, saves proof)
npm run demo

# 4. Build & start the monitoring loop
npm run build
npm start
```

### Development

```bash
npm run dev   # runs via ts-node
npm test      # vitest suite
npm run demo  # on-chain Alfajores demo → proof/demo.json
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CELO_NETWORK` | `mainnet` or `testnet` | `testnet` |
| `PRIVATE_KEY` | Agent wallet private key | (required) |
| `MONITOR_ADDRESSES` | Comma-separated addresses to watch | (empty) |
| `MONITOR_INTERVAL` | Seconds between monitoring cycles | `30` |

## On-Chain Demo

`npm run demo` connects to Celo Alfajores, reads the latest block, queries CELO and cUSD balances for the agent wallet, and writes the results to `proof/demo.json`. It uses RPC fallback (primary: `alfajores-forno.celo-testnet.org`, secondary: `celo-alfajores-rpc.allthatnode.com`).

## Celo Network Details

| | Mainnet | Alfajores Testnet |
|---|---|---|
| Chain ID | 42220 | 44787 |
| RPC | https://forno.celo.org | https://alfajores-forno.celo-testnet.org |
| Explorer | https://celoscan.io | https://alfajores.celoscan.io |

### Supported Tokens

| Token | Mainnet Address | Alfajores Address |
|---|---|---|
| CELO | `0x471EcE3750Da237f93B8E339c536989b8978a438` | native |
| cUSD | `0x765DE816845861e75A25fCA122bb6898B8B1282a` | `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` |
| cEUR | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` | `0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F` |
| cREAL | `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787` | — |

## License

MIT
