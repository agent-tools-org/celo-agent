import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type Address,
  type PublicClient,
  type Chain,
  type Transport,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { CELO_TOKENS, ERC20_ABI } from "../celo/config";
import { appendPaymentLog, type PaymentLogEntry } from "./log";

/** Token balance snapshot for a single address. */
export interface TokenBalances {
  address: Address;
  cUSD: string;
  cEUR: string;
  CELO: string;
}

/** Summary analytics derived from payment history. */
export interface BalanceAnalytics {
  totalOutgoing: string;
  totalIncoming: string;
  averageTxAmount: string;
  transactionCount: number;
}

/**
 * CeloPaymentAgent — monitors balances, executes stablecoin transfers,
 * tracks payment history, and generates plain-language summaries.
 *
 * Designed for Celo's sub-cent fee environment: the agent can make
 * frequent micro-payments without worrying about gas costs.
 */
export class CeloPaymentAgent {
  readonly publicClient: PublicClient<Transport, Chain>;
  private readonly account: PrivateKeyAccount;
  readonly agentAddress: Address;

  private paymentHistory: PaymentLogEntry[] = [];

  constructor(
    private readonly chain: Chain,
    privateKey: `0x${string}`,
  ) {
    this.account = privateKeyToAccount(privateKey);
    this.agentAddress = this.account.address;

    this.publicClient = createPublicClient({
      chain,
      transport: http(),
    });
  }

  // ---------------------------------------------------------------------------
  // Balance monitoring
  // ---------------------------------------------------------------------------

  /** Fetch cUSD, cEUR, and CELO balances for a given address. */
  async getBalances(address: Address): Promise<TokenBalances> {
    const [cUSD, cEUR, celoNative] = await Promise.all([
      this.readBalance(CELO_TOKENS.cUSD, address),
      this.readBalance(CELO_TOKENS.cEUR, address),
      this.publicClient.getBalance({ address }),
    ]);

    return {
      address,
      cUSD: formatUnits(cUSD, 18),
      cEUR: formatUnits(cEUR, 18),
      CELO: formatUnits(celoNative, 18),
    };
  }

  /** Monitor balances for a list of addresses. */
  async monitorAddresses(addresses: Address[]): Promise<TokenBalances[]> {
    return Promise.all(addresses.map((a) => this.getBalances(a)));
  }

  // ---------------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------------

  /** Transfer a stablecoin (cUSD or cEUR) to a recipient. Returns the tx hash. */
  async sendPayment(
    token: "cUSD" | "cEUR",
    to: Address,
    amount: string,
    memo?: string,
  ): Promise<`0x${string}`> {
    const tokenAddress = CELO_TOKENS[token];
    const value = parseUnits(amount, 18);

    const walletClient = createWalletClient({
      chain: this.chain,
      transport: http(),
      account: this.account,
    });

    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, value],
    });

    const entry: PaymentLogEntry = {
      timestamp: new Date().toISOString(),
      from: this.agentAddress,
      to,
      token,
      amount,
      txHash: hash,
      memo: memo ?? "",
    };

    this.paymentHistory.push(entry);
    await appendPaymentLog(entry);

    return hash;
  }

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------

  /** Compute analytics from in-memory payment history. */
  getAnalytics(): BalanceAnalytics {
    let totalOut = 0n;
    let totalIn = 0n;

    for (const p of this.paymentHistory) {
      const amt = parseUnits(p.amount, 18);
      if (p.from.toLowerCase() === this.agentAddress.toLowerCase()) {
        totalOut += amt;
      }
      if (p.to.toLowerCase() === this.agentAddress.toLowerCase()) {
        totalIn += amt;
      }
    }

    const count = this.paymentHistory.length;
    const avg = count > 0 ? totalOut / BigInt(count) : 0n;

    return {
      totalOutgoing: formatUnits(totalOut, 18),
      totalIncoming: formatUnits(totalIn, 18),
      averageTxAmount: formatUnits(avg, 18),
      transactionCount: count,
    };
  }

  // ---------------------------------------------------------------------------
  // Summaries
  // ---------------------------------------------------------------------------

  /** Generate a plain-language summary of the agent's recent activity. */
  generateSummary(balances: TokenBalances[]): string {
    const analytics = this.getAnalytics();
    const lines: string[] = [
      "=== Celo Payment Agent Summary ===",
      "",
      `Agent wallet: ${this.agentAddress}`,
      `Payments executed: ${analytics.transactionCount}`,
      `Total outgoing: ${analytics.totalOutgoing} (stablecoin)`,
      `Total incoming: ${analytics.totalIncoming} (stablecoin)`,
      `Average tx size: ${analytics.averageTxAmount}`,
      "",
      "--- Monitored Balances ---",
    ];

    for (const b of balances) {
      lines.push(
        `  ${b.address}`,
        `    cUSD: ${b.cUSD}  |  cEUR: ${b.cEUR}  |  CELO: ${b.CELO}`,
      );
    }

    lines.push(
      "",
      "Celo advantage: sub-cent fees make micro-payments practical.",
      "==================================",
    );

    return lines.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async readBalance(token: Address, owner: Address): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    });
    return result as bigint;
  }
}
