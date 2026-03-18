import { type Chain, type Address } from "viem";

/**
 * Celo Mainnet chain definition for viem.
 * Chain ID 42220 — production Celo network with sub-cent tx fees.
 */
export const celoMainnet: Chain = {
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://celoscan.io" },
  },
};

/**
 * Celo Alfajores testnet chain definition for viem.
 * Chain ID 44787 — Celo's primary testnet for development.
 */
export const celoAlfajores: Chain = {
  id: 44787,
  name: "Celo Alfajores",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://alfajores-forno.celo-testnet.org"] },
  },
  blockExplorers: {
    default: {
      name: "Celoscan Alfajores",
      url: "https://alfajores.celoscan.io",
    },
  },
  testnet: true,
};

/** ERC-20 token addresses on Celo. Identical across mainnet & Alfajores. */
export const CELO_TOKENS = {
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438" as Address,
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as Address,
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73" as Address,
  cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787" as Address,
} as const;

/** Minimal ERC-20 ABI used by the agent for balanceOf, transfer, and Transfer events. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;
