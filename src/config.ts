import { type Address, type Chain } from "viem";
import { celoMainnet, celoAlfajores } from "./celo/config";

export interface RecurringPayment {
  /** Human-readable label */
  label: string;
  /** Recipient address */
  to: Address;
  /** Amount in token-native decimals (e.g. "5.00" for 5 cUSD) */
  amount: string;
  /** Token symbol — only cUSD and cEUR supported */
  token: "cUSD" | "cEUR";
  /** Interval in seconds between payments */
  intervalSeconds: number;
}

export interface AppConfig {
  /** Active Celo chain */
  chain: Chain;
  /** Network label */
  network: "mainnet" | "testnet";
  /** Agent wallet private key (hex, with 0x prefix) */
  privateKey: `0x${string}`;
  /** Addresses the agent monitors for balance / analytics */
  monitorAddresses: Address[];
  /** Recurring payment definitions */
  recurringPayments: RecurringPayment[];
  /** How often (seconds) the agent runs its monitoring loop */
  monitorIntervalSeconds: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Build application config from environment variables.
 * Reads: CELO_NETWORK, PRIVATE_KEY, MONITOR_ADDRESSES, MONITOR_INTERVAL
 */
export function loadConfig(): AppConfig {
  const network = (process.env.CELO_NETWORK ?? "testnet") as "mainnet" | "testnet";
  const chain = network === "mainnet" ? celoMainnet : celoAlfajores;

  const rawKey = requireEnv("PRIVATE_KEY");
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  const monitorAddresses = (process.env.MONITOR_ADDRESSES ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean) as Address[];

  const monitorIntervalSeconds = Number(process.env.MONITOR_INTERVAL ?? "30");

  // Recurring payments can be extended via config file; seeded with an empty list.
  const recurringPayments: RecurringPayment[] = [];

  return {
    chain,
    network,
    privateKey,
    monitorAddresses,
    recurringPayments,
    monitorIntervalSeconds,
  };
}
