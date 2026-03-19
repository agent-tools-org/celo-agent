import { describe, it, expect } from "vitest";
import { compile } from "../src/compile";

describe("compile", () => {
  const artifact = compile();

  it("produces a valid ABI array", () => {
    expect(Array.isArray(artifact.abi)).toBe(true);
    expect(artifact.abi.length).toBeGreaterThan(0);
  });

  it("ABI contains expected functions and event", () => {
    const names = (artifact.abi as { name?: string; type: string }[])
      .filter((e) => e.name)
      .map((e) => e.name);
    expect(names).toContain("logPayment");
    expect(names).toContain("getPaymentCount");
    expect(names).toContain("getPayment");
    expect(names).toContain("PaymentLogged");
  });

  it("bytecode is a non-empty hex string", () => {
    expect(typeof artifact.bytecode).toBe("string");
    expect(artifact.bytecode.length).toBeGreaterThan(0);
    expect(artifact.bytecode).toMatch(/^[0-9a-fA-F]+$/);
  });
});
