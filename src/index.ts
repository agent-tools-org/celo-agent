import { loadConfig } from "./config";
import { CeloPaymentAgent } from "./agent/payment-agent";
import { PaymentScheduler } from "./agent/scheduler";
import { PaymentReporter } from "./analytics/reporter";

async function main(): Promise<void> {
  console.log("🟡 Celo Payment Agent starting…");

  const config = loadConfig();
  console.log(`Network: ${config.network} (chain ${config.chain.id})`);

  const agent = new CeloPaymentAgent(config.chain, config.privateKey);
  console.log(`Agent wallet: ${agent.agentAddress}`);

  // Scheduler
  const scheduler = new PaymentScheduler(agent);
  scheduler.loadAll(config.recurringPayments);

  // Reporter (shares the public client with the agent)
  const reporter = new PaymentReporter(agent.publicClient);

  // --- Monitoring loop ---
  let running = true;

  const shutdown = (): void => {
    console.log("\n🔴 Shutting down gracefully…");
    running = false;
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(
    `Monitoring ${config.monitorAddresses.length} address(es) every ${config.monitorIntervalSeconds}s`,
  );
  console.log("Press Ctrl+C to stop.\n");

  while (running) {
    try {
      // 1. Check balances
      const balances = await agent.monitorAddresses(config.monitorAddresses);

      // 2. Execute due recurring payments
      const executed = await scheduler.checkAndExecute();
      if (executed > 0) {
        console.log(`[loop] ${executed} scheduled payment(s) executed`);
      }

      // 3. Print summary
      const summary = agent.generateSummary(balances);
      console.log(summary);

      // 4. Periodic on-chain analytics (every loop for demo; in production gate by time)
      if (config.monitorAddresses.length > 0) {
        const latestBlock = await agent.publicClient.getBlockNumber();
        const lookback = 5000n; // ~1 hour of blocks on Celo (1 block/s ≈ 5s)
        const fromBlock = latestBlock > lookback ? latestBlock - lookback : 0n;

        for (const addr of config.monitorAddresses) {
          const report = await reporter.generateReport(
            addr,
            fromBlock,
            latestBlock,
            "last ~5000 blocks",
          );
          reporter.printReport(report);
        }
      }
    } catch (err) {
      console.error(
        "[loop] error:",
        err instanceof Error ? err.message : err,
      );
    }

    // Wait for next interval (interruptible via flag)
    await sleep(config.monitorIntervalSeconds * 1000, () => running);
  }

  console.log("Agent stopped.");
}

/** Sleep that can be interrupted by a flag check. */
function sleep(ms: number, isRunning: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const interval = 500;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      if (elapsed >= ms || !isRunning()) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
