import {
  type Address,
  type PublicClient,
  type Transport,
  type Chain,
  formatUnits,
  parseAbiItem,
} from "viem";
import { CELO_TOKENS } from "../celo/config";

/** A single transfer event decoded from on-chain logs. */
export interface TransferEvent {
  from: Address;
  to: Address;
  value: bigint;
  blockNumber: bigint;
}

/** Aggregated analytics report for an address. */
export interface AnalyticsReport {
  address: Address;
  periodLabel: string;
  totalVolume: string;
  inboundVolume: string;
  outboundVolume: string;
  transactionCount: number;
  averageAmount: string;
  topRecipients: Array<{ address: Address; total: string }>;
}

/**
 * PaymentReporter reads on-chain ERC-20 Transfer events for tracked
 * addresses and produces analytics reports (daily volume, top recipients,
 * average amount).
 */
export class PaymentReporter {
  constructor(private client: PublicClient<Transport, Chain>) {}

  /**
   * Fetch cUSD Transfer events involving `address` within the given block range.
   * Queries both inbound and outbound transfers.
   */
  async getTransferEvents(
    address: Address,
    fromBlock: bigint,
    toBlock: bigint,
    token: "cUSD" | "cEUR" = "cUSD",
  ): Promise<TransferEvent[]> {
    const tokenAddress = CELO_TOKENS[token];
    const transferEvent = parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    );

    // Outbound transfers
    const outboundLogs = await this.client.getLogs({
      address: tokenAddress,
      event: transferEvent,
      args: { from: address },
      fromBlock,
      toBlock,
    });

    // Inbound transfers
    const inboundLogs = await this.client.getLogs({
      address: tokenAddress,
      event: transferEvent,
      args: { to: address },
      fromBlock,
      toBlock,
    });

    const events: TransferEvent[] = [];

    for (const log of [...outboundLogs, ...inboundLogs]) {
      const args = log.args as { from?: Address; to?: Address; value?: bigint };
      if (args.from && args.to && args.value !== undefined) {
        events.push({
          from: args.from,
          to: args.to,
          value: args.value,
          blockNumber: log.blockNumber,
        });
      }
    }

    // Deduplicate (a self-transfer shows up in both queries)
    const seen = new Set<string>();
    return events.filter((e) => {
      const key = `${e.from}-${e.to}-${e.value}-${e.blockNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate an analytics report for the given address and block range.
   */
  async generateReport(
    address: Address,
    fromBlock: bigint,
    toBlock: bigint,
    periodLabel: string = "recent",
  ): Promise<AnalyticsReport> {
    const events = await this.getTransferEvents(address, fromBlock, toBlock);

    let inbound = 0n;
    let outbound = 0n;
    const recipientTotals = new Map<string, bigint>();

    for (const e of events) {
      if (e.to.toLowerCase() === address.toLowerCase()) {
        inbound += e.value;
      }
      if (e.from.toLowerCase() === address.toLowerCase()) {
        outbound += e.value;
        const key = e.to.toLowerCase() as Address;
        recipientTotals.set(key, (recipientTotals.get(key) ?? 0n) + e.value);
      }
    }

    const totalVolume = inbound + outbound;
    const count = events.length;
    const avg = count > 0 ? totalVolume / BigInt(count) : 0n;

    // Sort recipients by total descending
    const topRecipients = [...recipientTotals.entries()]
      .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))
      .slice(0, 5)
      .map(([addr, total]) => ({
        address: addr as Address,
        total: formatUnits(total, 18),
      }));

    return {
      address,
      periodLabel,
      totalVolume: formatUnits(totalVolume, 18),
      inboundVolume: formatUnits(inbound, 18),
      outboundVolume: formatUnits(outbound, 18),
      transactionCount: count,
      averageAmount: formatUnits(avg, 18),
      topRecipients,
    };
  }

  /** Print a human-readable report to the console. */
  printReport(report: AnalyticsReport): void {
    console.log(`\n--- Payment Analytics: ${report.periodLabel} ---`);
    console.log(`Address: ${report.address}`);
    console.log(`Total volume: ${report.totalVolume} cUSD`);
    console.log(`  Inbound:  ${report.inboundVolume} cUSD`);
    console.log(`  Outbound: ${report.outboundVolume} cUSD`);
    console.log(`Transactions: ${report.transactionCount}`);
    console.log(`Average amount: ${report.averageAmount} cUSD`);
    if (report.topRecipients.length > 0) {
      console.log("Top recipients:");
      for (const r of report.topRecipients) {
        console.log(`  ${r.address}: ${r.total} cUSD`);
      }
    }
    console.log("-------------------------------------------\n");
  }
}
