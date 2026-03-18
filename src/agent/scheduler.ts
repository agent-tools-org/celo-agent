import { type Address } from "viem";
import { type RecurringPayment } from "../config";
import { CeloPaymentAgent } from "./payment-agent";

interface ScheduledEntry {
  payment: RecurringPayment;
  nextDueMs: number;
}

/**
 * Recurring payment scheduler.
 *
 * Maintains a list of recurring payment definitions and tracks when each
 * is next due.  On every tick the caller invokes `checkAndExecute()` —
 * any payment whose due time has passed is executed via the payment agent
 * and rescheduled for the next interval.
 */
export class PaymentScheduler {
  private entries: ScheduledEntry[] = [];

  constructor(private agent: CeloPaymentAgent) {}

  /** Register a recurring payment.  First execution happens after one interval. */
  addRecurring(payment: RecurringPayment): void {
    this.entries.push({
      payment,
      nextDueMs: Date.now() + payment.intervalSeconds * 1000,
    });
    console.log(
      `[scheduler] registered "${payment.label}" → ${payment.to} every ${payment.intervalSeconds}s`,
    );
  }

  /** Load multiple recurring payments at once. */
  loadAll(payments: RecurringPayment[]): void {
    for (const p of payments) {
      this.addRecurring(p);
    }
  }

  /** Get the list of scheduled entries with their next due date. */
  getSchedule(): Array<{ label: string; to: Address; nextDue: string }> {
    return this.entries.map((e) => ({
      label: e.payment.label,
      to: e.payment.to as Address,
      nextDue: new Date(e.nextDueMs).toISOString(),
    }));
  }

  /**
   * Check all scheduled payments and execute any that are due.
   * Returns the number of payments executed.
   */
  async checkAndExecute(): Promise<number> {
    const now = Date.now();
    let executed = 0;

    for (const entry of this.entries) {
      if (now >= entry.nextDueMs) {
        const { payment } = entry;
        try {
          console.log(
            `[scheduler] executing "${payment.label}": ${payment.amount} ${payment.token} → ${payment.to}`,
          );
          const hash = await this.agent.sendPayment(
            payment.token,
            payment.to as Address,
            payment.amount,
            `recurring: ${payment.label}`,
          );
          console.log(`[scheduler] tx sent: ${hash}`);
          executed++;
        } catch (err) {
          console.error(
            `[scheduler] failed to execute "${payment.label}":`,
            err instanceof Error ? err.message : err,
          );
        }
        // Reschedule regardless of success/failure to avoid infinite retries
        entry.nextDueMs = now + payment.intervalSeconds * 1000;
      }
    }

    return executed;
  }
}
