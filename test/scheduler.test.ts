import { describe, it, expect, vi, beforeEach } from "vitest";
import { PaymentScheduler } from "../src/agent/scheduler";
import type { RecurringPayment } from "../src/config";
import type { CeloPaymentAgent } from "../src/agent/payment-agent";
import type { Address } from "viem";

const RECIPIENT = "0x1234567890abcdef1234567890abcdef12345678" as Address;

function makePayment(overrides?: Partial<RecurringPayment>): RecurringPayment {
  return {
    label: "Test Payment",
    to: RECIPIENT,
    amount: "1.00",
    token: "cUSD",
    intervalSeconds: 60,
    ...overrides,
  };
}

function makeMockAgent(): CeloPaymentAgent {
  return {
    sendPayment: vi.fn().mockResolvedValue("0xabcdef" as `0x${string}`),
  } as unknown as CeloPaymentAgent;
}

describe("PaymentScheduler", () => {
  let agent: CeloPaymentAgent;
  let scheduler: PaymentScheduler;

  beforeEach(() => {
    agent = makeMockAgent();
    scheduler = new PaymentScheduler(agent);
  });

  describe("addRecurring", () => {
    it("adds a payment to the schedule", () => {
      scheduler.addRecurring(makePayment());

      const schedule = scheduler.getSchedule();
      expect(schedule).toHaveLength(1);
      expect(schedule[0].label).toBe("Test Payment");
      expect(schedule[0].to).toBe(RECIPIENT);
    });

    it("sets next due time in the future", () => {
      const before = Date.now();
      scheduler.addRecurring(makePayment({ intervalSeconds: 120 }));
      const after = Date.now();

      const schedule = scheduler.getSchedule();
      const dueMs = new Date(schedule[0].nextDue).getTime();

      // nextDueMs should be roughly now + 120s
      expect(dueMs).toBeGreaterThanOrEqual(before + 120_000);
      expect(dueMs).toBeLessThanOrEqual(after + 120_000);
    });

    it("can add multiple payments", () => {
      scheduler.addRecurring(makePayment({ label: "Rent" }));
      scheduler.addRecurring(makePayment({ label: "Subscription" }));
      scheduler.addRecurring(makePayment({ label: "Salary" }));

      expect(scheduler.getSchedule()).toHaveLength(3);
    });
  });

  describe("loadAll", () => {
    it("loads multiple recurring payments at once", () => {
      const payments = [
        makePayment({ label: "A" }),
        makePayment({ label: "B" }),
      ];

      scheduler.loadAll(payments);

      const schedule = scheduler.getSchedule();
      expect(schedule).toHaveLength(2);
      expect(schedule[0].label).toBe("A");
      expect(schedule[1].label).toBe("B");
    });

    it("handles empty array", () => {
      scheduler.loadAll([]);
      expect(scheduler.getSchedule()).toHaveLength(0);
    });
  });

  describe("getSchedule", () => {
    it("returns entries with label, to, and ISO nextDue", () => {
      scheduler.addRecurring(makePayment());

      const [entry] = scheduler.getSchedule();
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("to");
      expect(entry).toHaveProperty("nextDue");

      // nextDue should be a valid ISO date string
      expect(new Date(entry.nextDue).toISOString()).toBe(entry.nextDue);
    });

    it("returns empty array when no payments registered", () => {
      expect(scheduler.getSchedule()).toEqual([]);
    });
  });

  describe("checkAndExecute", () => {
    it("returns 0 when no payments are due", async () => {
      scheduler.addRecurring(makePayment({ intervalSeconds: 9999 }));

      const count = await scheduler.checkAndExecute();
      expect(count).toBe(0);
      expect(agent.sendPayment).not.toHaveBeenCalled();
    });

    it("executes a payment that is past due", async () => {
      scheduler.addRecurring(makePayment({ intervalSeconds: 60 }));

      // Fast-forward the due time to the past
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);

      const count = await scheduler.checkAndExecute();
      expect(count).toBe(1);
      expect(agent.sendPayment).toHaveBeenCalledWith(
        "cUSD",
        RECIPIENT,
        "1.00",
        "recurring: Test Payment",
      );

      vi.restoreAllMocks();
    });

    it("reschedules payment after execution", async () => {
      scheduler.addRecurring(makePayment({ intervalSeconds: 60 }));

      const futureNow = Date.now() + 120_000;
      vi.spyOn(Date, "now").mockReturnValue(futureNow);

      await scheduler.checkAndExecute();

      const schedule = scheduler.getSchedule();
      const nextDueMs = new Date(schedule[0].nextDue).getTime();

      // Should be rescheduled to futureNow + 60s
      expect(nextDueMs).toBe(futureNow + 60_000);

      vi.restoreAllMocks();
    });

    it("executes multiple due payments", async () => {
      scheduler.addRecurring(makePayment({ label: "A", intervalSeconds: 10 }));
      scheduler.addRecurring(makePayment({ label: "B", intervalSeconds: 20 }));

      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 30_000);

      const count = await scheduler.checkAndExecute();
      expect(count).toBe(2);
      expect(agent.sendPayment).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it("reschedules even if sendPayment throws", async () => {
      (agent.sendPayment as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("tx failed"),
      );

      scheduler.addRecurring(makePayment({ intervalSeconds: 60 }));

      const futureNow = Date.now() + 120_000;
      vi.spyOn(Date, "now").mockReturnValue(futureNow);

      const count = await scheduler.checkAndExecute();
      // Execution failed, so count stays 0
      expect(count).toBe(0);

      // But it should still be rescheduled
      const schedule = scheduler.getSchedule();
      const nextDueMs = new Date(schedule[0].nextDue).getTime();
      expect(nextDueMs).toBe(futureNow + 60_000);

      vi.restoreAllMocks();
    });

    it("supports cEUR token payments", async () => {
      scheduler.addRecurring(
        makePayment({ token: "cEUR", amount: "50.00", intervalSeconds: 10 }),
      );

      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 20_000);

      await scheduler.checkAndExecute();
      expect(agent.sendPayment).toHaveBeenCalledWith(
        "cEUR",
        RECIPIENT,
        "50.00",
        "recurring: Test Payment",
      );

      vi.restoreAllMocks();
    });
  });
});
