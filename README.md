# Celo Payment Agent

> **Best Agent on Celo** — AI-powered payment agent that leverages Celo's sub-cent transaction fees for frequent, automated stablecoin payments.

## Why Celo?

Celo is an Ethereum L2 optimized for real-world payments. Transaction fees are typically **under $0.001**, making it uniquely suited for AI agents that need to execute frequent micro-payments — something cost-prohibitive on other chains.

This agent demonstrates:

- **Automated balance monitoring** across multiple wallets
- **Stablecoin payments** (cUSD, cEUR) executed by an AI agent
- **Recurring payment scheduling** — payroll, subscriptions, or DCA
- **On-chain analytics** — transfer volume, top recipients, daily summaries
- **Plain-language summaries** so anyone can understand payment flows

## Architecture

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

## Quick Start

### Prerequisites

- Node.js ≥ 18
- A Celo wallet with testnet CELO (for gas) and cUSD — get from [Celo Faucet](https://faucet.celo.org)

### Setup

```bash
npm install

cp .env.example .env
# Edit .env with your private key and addresses

npm run build
npm start
```

### Development

```bash
npm run dev  # runs via ts-node
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CELO_NETWORK` | `mainnet` or `testnet` | `testnet` |
| `PRIVATE_KEY` | Agent wallet private key | (required) |
| `MONITOR_ADDRESSES` | Comma-separated addresses to watch | (empty) |
| `MONITOR_INTERVAL` | Seconds between monitoring cycles | `30` |

## Key Features

### Balance Monitoring
The agent periodically checks cUSD, cEUR, and CELO balances for all configured addresses and generates human-readable summaries.

### Stablecoin Payments
Execute cUSD or cEUR transfers programmatically. Every payment is logged to `logs/payments.jsonl` with timestamp, amounts, and transaction hash.

### Recurring Payments
Define scheduled payments with label, recipient, amount, token, and interval. The scheduler automatically executes payments when due and tracks the next execution time.

### On-Chain Analytics
The reporter queries ERC-20 Transfer events directly from Celo and computes:
- Total inbound/outbound volume
- Transaction count and average amount
- Top recipients by volume

## Celo Network Details

| | Mainnet | Alfajores Testnet |
|---|---|---|
| Chain ID | 42220 | 44787 |
| RPC | https://forno.celo.org | https://alfajores-forno.celo-testnet.org |
| Explorer | https://celoscan.io | https://alfajores.celoscan.io |

### Supported Tokens

| Token | Address |
|---|---|
| CELO | `0x471EcE3750Da237f93B8E339c536989b8978a438` |
| cUSD | `0x765DE816845861e75A25fCA122bb6898B8B1282a` |
| cEUR | `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73` |
| cREAL | `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787` |

## License

MIT
