import { describe, it, expect } from "vitest";
import {
  celoMainnet,
  celoAlfajores,
  CELO_TOKENS,
  ERC20_ABI,
} from "../src/celo/config";

describe("celoMainnet", () => {
  it("has chain ID 42220", () => {
    expect(celoMainnet.id).toBe(42220);
  });

  it("has name Celo", () => {
    expect(celoMainnet.name).toBe("Celo");
  });

  it("uses CELO as native currency with 18 decimals", () => {
    expect(celoMainnet.nativeCurrency).toEqual({
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    });
  });

  it("has mainnet RPC URL", () => {
    expect(celoMainnet.rpcUrls.default.http).toContain(
      "https://forno.celo.org",
    );
  });

  it("has Celoscan block explorer", () => {
    expect(celoMainnet.blockExplorers?.default.url).toBe(
      "https://celoscan.io",
    );
  });

  it("is not marked as testnet", () => {
    expect(celoMainnet.testnet).toBeUndefined();
  });
});

describe("celoAlfajores", () => {
  it("has chain ID 44787", () => {
    expect(celoAlfajores.id).toBe(44787);
  });

  it("has name Celo Alfajores", () => {
    expect(celoAlfajores.name).toBe("Celo Alfajores");
  });

  it("uses CELO as native currency with 18 decimals", () => {
    expect(celoAlfajores.nativeCurrency).toEqual({
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    });
  });

  it("has Alfajores RPC URL", () => {
    expect(celoAlfajores.rpcUrls.default.http).toContain(
      "https://alfajores-forno.celo-testnet.org",
    );
  });

  it("has Alfajores block explorer", () => {
    expect(celoAlfajores.blockExplorers?.default.url).toBe(
      "https://alfajores.celoscan.io",
    );
  });

  it("is marked as testnet", () => {
    expect(celoAlfajores.testnet).toBe(true);
  });
});

describe("CELO_TOKENS", () => {
  it("has all four token addresses", () => {
    expect(Object.keys(CELO_TOKENS)).toEqual(["CELO", "cUSD", "cEUR", "cREAL"]);
  });

  it("CELO address is correct", () => {
    expect(CELO_TOKENS.CELO).toBe(
      "0x471EcE3750Da237f93B8E339c536989b8978a438",
    );
  });

  it("cUSD address is correct", () => {
    expect(CELO_TOKENS.cUSD).toBe(
      "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    );
  });

  it("cEUR address is correct", () => {
    expect(CELO_TOKENS.cEUR).toBe(
      "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    );
  });

  it("cREAL address is correct", () => {
    expect(CELO_TOKENS.cREAL).toBe(
      "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
    );
  });

  it("all addresses are valid hex with 0x prefix", () => {
    for (const addr of Object.values(CELO_TOKENS)) {
      expect(addr).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});

describe("ERC20_ABI", () => {
  it("includes balanceOf function", () => {
    const entry = ERC20_ABI.find(
      (e) => e.type === "function" && e.name === "balanceOf",
    );
    expect(entry).toBeDefined();
  });

  it("includes transfer function", () => {
    const entry = ERC20_ABI.find(
      (e) => e.type === "function" && e.name === "transfer",
    );
    expect(entry).toBeDefined();
  });

  it("includes Transfer event", () => {
    const entry = ERC20_ABI.find(
      (e) => e.type === "event" && e.name === "Transfer",
    );
    expect(entry).toBeDefined();
  });

  it("includes decimals and symbol view functions", () => {
    const decimals = ERC20_ABI.find(
      (e) => e.type === "function" && e.name === "decimals",
    );
    const symbol = ERC20_ABI.find(
      (e) => e.type === "function" && e.name === "symbol",
    );
    expect(decimals).toBeDefined();
    expect(symbol).toBeDefined();
  });
});
